"use client";

import { useCallback, useEffect, useState } from "react";
import { authClient } from "@/backend/auth/client";
import type {
  CurrentAccountResponse,
  EventItem,
  PageId,
  RewardItem,
  Task,
  User,
} from "./types";
import { AppShell } from "./components/layout/AppShell";
import { Login } from "./components/auth/Login";
import { EmployeeHome } from "./features/home/EmployeeHome";
import { TasksPage } from "./features/tasks/TasksPage";
import { EventsPage } from "./features/events/EventsPage";
import { StorePage } from "./features/store/StorePage";
import { AssistantPage } from "./features/assistant/AssistantPage";
import { ActivityTrackingPage } from "./features/activity/ActivityTrackingPage";
import { AdminPanel } from "./features/admin/AdminPanel";

function accountToUser(account: CurrentAccountResponse): User {
  const initials = account.user.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return {
    id: account.user.id,
    tenantId: account.company.id,
    name: account.user.name,
    initials,
    position: account.employee?.jobTitle ?? "Сотрудник",
    department: account.employee?.department?.name ?? "Без отдела",
    role: account.membership.role,
    activityPoints: account.employee?.activityPoints ?? 0,
    walletPoints: account.employee?.walletPoints ?? 0,
    level: "yellow",
    companyName: account.company.name,
    email: account.user.email,
    capabilities: account.membership.capabilities ?? [],
  };
}

export function PlatformApp() {
  const [user, setUser] = useState<User | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [page, setPage] = useState<PageId>("home");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [wallet, setWallet] = useState(0);
  const [toast, setToast] = useState("");

  const loadAccount = useCallback(async () => {
    const response = await fetch("/api/me", {
      headers: { accept: "application/json" },
      credentials: "include",
    });
    if (!response.ok)
      throw new Error("Не удалось загрузить рабочее пространство");
    const nextUser = accountToUser(
      (await response.json()) as CurrentAccountResponse,
    );
    setUser(nextUser);
    setWallet(nextUser.walletPoints);
    if (nextUser.role === "admin") setPage("admin_roles");
    return nextUser;
  }, []);

  const loadTasks = useCallback(async () => {
    setTasksLoading(true);
    try {
      const response = await fetch("/api/tasks", {
        headers: { accept: "application/json" },
        credentials: "include",
      });
      if (!response.ok) throw new Error("Не удалось загрузить задачи");
      const payload = (await response.json()) as { tasks: Task[] };
      setTasks(payload.tasks);
    } catch {
      setToast("Не удалось обновить задачи");
      window.setTimeout(() => setToast(""), 2600);
    } finally {
      setTasksLoading(false);
    }
  }, []);

  const loadEvents = useCallback(async () => {
    try {
      const response = await fetch("/api/events", {
        headers: { accept: "application/json" },
        credentials: "include",
      });
      if (!response.ok) throw new Error("Не удалось загрузить мероприятия");
      const payload = (await response.json()) as { events: EventItem[] };
      setEvents(payload.events);
    } catch {
      setToast("Не удалось обновить мероприятия");
      window.setTimeout(() => setToast(""), 2600);
    }
  }, []);

  const loadStore = useCallback(async () => {
    try {
      const response = await fetch("/api/store", {
        headers: { accept: "application/json" },
        credentials: "include",
      });
      if (!response.ok) throw new Error("Не удалось загрузить магазин");
      const payload = (await response.json()) as { bonuses: RewardItem[] };
      setRewards(payload.bonuses);
    } catch {
      setToast("Не удалось обновить магазин бонусов");
      window.setTimeout(() => setToast(""), 2600);
    }
  }, []);

  useEffect(() => {
    let active = true;
    authClient
      .getSession()
      .then(async ({ data }) => {
        if (!data?.session || !active) return;
        const account = await loadAccount();
        if (account.role !== "admin")
          await Promise.all([loadTasks(), loadEvents(), loadStore()]);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setSessionLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadAccount, loadEvents, loadStore, loadTasks]);

  useEffect(() => {
    if (!user || user.role === "admin" || page !== "tasks") return;
    const timer = window.setTimeout(() => void loadTasks(), 0);
    return () => window.clearTimeout(timer);
  }, [loadTasks, page, user]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };
  const joinEvent = async (id: string) => {
    const response = await fetch(`/api/events/${id}/registrations`, {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) {
      notify(
        response.status === 409
          ? "Регистрация уже закрыта или мест нет"
          : "Не удалось зарегистрироваться",
      );
      return;
    }
    await loadEvents();
    notify("Вы зарегистрированы на мероприятие");
  };
  const buyReward = async (reward: RewardItem) => {
    if (wallet < reward.price) return notify("Недостаточно баллов");
    const response = await fetch(`/api/store/${reward.id}/redemptions`, {
      method: "POST",
      credentials: "include",
    });
    const payload = (await response.json().catch(() => ({}))) as {
      walletPoints?: number;
      error?: { message?: string };
    };
    if (!response.ok)
      return notify(payload.error?.message ?? "Не удалось получить бонус");
    setWallet(payload.walletPoints ?? wallet - reward.price);
    await loadStore();
    notify(`Заявка на бонус «${reward.title}» создана`);
  };
  const login = async (credentials: {
    email: string;
    password: string;
    rememberMe: boolean;
  }) => {
    setAuthError("");
    const result = await authClient.signIn.email(credentials);
    if (result.error) {
      setAuthError("Неверная почта или пароль");
      return;
    }
    const account = await loadAccount();
    if (account.role !== "admin")
      await Promise.all([loadTasks(), loadEvents(), loadStore()]);
  };
  const logout = async () => {
    await authClient.signOut();
    setUser(null);
    setPage("home");
  };

  if (sessionLoading)
    return (
      <div className="session-loader" role="status">
        Загружаем рабочее пространство…
      </div>
    );
  if (!user)
    return <Login error={authError} onLogin={login} />;

  const adminPageCapability: Partial<Record<PageId, string>> = {
    admin_roles: "roles.manage",
    admin_crm: "crm.manage",
    admin_notifications: "notifications.manage",
    admin_events: "events.manage",
    admin_ai: "ai.manage",
    admin_bonuses: "bonuses.manage",
  };
  const canOpenAdminPage =
    user.role === "admin" ||
    (adminPageCapability[page]
      ? user.capabilities.includes(adminPageCapability[page]!)
      : false);

  return (
    <AppShell
      user={user}
      page={page}
      onNavigate={setPage}
      onLogout={logout}
      toast={toast}
    >
      {page === "home" && (
        <EmployeeHome
          user={user}
          tasks={tasks}
          events={events}
          wallet={wallet}
          navigate={setPage}
        />
      )}
      {page === "tasks" && (
        <TasksPage
          tasks={tasks}
          loading={tasksLoading}
          onRefresh={loadTasks}
        />
      )}
      {page === "events" && <EventsPage events={events} join={joinEvent} />}
      {page === "store" && (
        <StorePage wallet={wallet} rewards={rewards} buy={buyReward} />
      )}
      {page === "career" && <AssistantPage />}
      {page === "activity" &&
        (["manager", "hr", "admin"].includes(user.role) ||
          user.capabilities.includes("activity.company.read")) && (
          <ActivityTrackingPage
            role={user.role}
            capabilities={user.capabilities}
          />
        )}
      {page.startsWith("admin_") && canOpenAdminPage && (
        <AdminPanel page={page} notify={notify} />
      )}
    </AppShell>
  );
}
