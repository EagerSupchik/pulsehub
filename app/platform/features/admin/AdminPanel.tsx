"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { Icon } from "../../icons";
import type { PageId } from "../../types";

type Notify = (message: string) => void;
type AccessRole = {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  assignedCount: number;
};
type AssignableMember = {
  membershipId: string;
  name: string;
  email: string;
  jobTitle: string | null;
  assigned?: boolean;
};
type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
const emptyPagination: Pagination = {
  page: 1,
  pageSize: 25,
  total: 0,
  totalPages: 1,
};
type Department = { id: string; name: string };
type CompanyAccount = {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  role: "employee" | "manager" | "hr" | "admin";
  status: "active" | "suspended";
  jobTitle: string | null;
  departmentId: string | null;
  departmentName: string | null;
};
type Integration = {
  id: string;
  provider: string;
  name: string;
  baseUrl: string | null;
  status: "active" | "paused";
  defaultPoints: number;
  lastSyncAt: string | null;
};
type AdminEvent = {
  id: string;
  title: string;
  kind: string;
  location: string;
  startsAt: string;
  capacity: number;
  status: "published" | "cancelled";
  registrations: number;
};
type AdminBonus = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  price: number;
  emoji: string;
  tint: "blue" | "peach" | "mint" | "violet";
  stock: number | null;
  status: "active" | "archived";
  redemptions: number;
};
type BonusRedemption = {
  id: string;
  bonusTitle: string;
  employeeName: string;
  employeeEmail: string;
  price: number;
  status: "requested" | "approved" | "fulfilled" | "cancelled";
  createdAt: string;
};

const permissionOptions = [
  [
    "users.manage",
    "Сотрудники",
    "Добавление, изменение и блокировка учётных записей",
  ],
  ["roles.manage", "Роли и доступ", "Создание ролей и изменение полномочий"],
  [
    "events.manage",
    "Мероприятия",
    "Создание, изменение и удаление мероприятий",
  ],
  [
    "events.registrations.read",
    "Регистрации",
    "Просмотр и экспорт участников мероприятий",
  ],
  ["bonuses.manage", "Бонусы", "Управление каталогом и стоимостью бонусов"],
  ["activity.company.read", "Трекинг", "Доступ к активности всей компании"],
  [
    "activity.settings.manage",
    "Пороги активности",
    "Изменение правил оценки активности",
  ],
  ["crm.manage", "CRM", "Подключение CRM и настройка синхронизации"],
  [
    "notifications.manage",
    "Уведомления",
    "Настройка почтовых уведомлений и рассылок",
  ],
  ["ai.manage", "ИИ", "Выбор модели, ключей и системных инструкций"],
] as const;

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    ...init,
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(payload?.error?.message ?? "Не удалось выполнить действие");
  return payload as T;
}

function AdminHeading({ title }: { title: string }) {
  return (
    <div className="page-heading admin-heading">
      <h1>{title}</h1>
    </div>
  );
}

function PaginationControls({
  pagination,
  onPage,
}: {
  pagination: Pagination;
  onPage: (page: number) => void;
}) {
  return (
    <nav className="admin-pagination" aria-label="Навигация по страницам">
      <button
        type="button"
        disabled={pagination.page <= 1}
        onClick={() => onPage(Math.max(1, pagination.page - 1))}
      >
        Назад
      </button>
      <span>
        {pagination.page} из {pagination.totalPages}
      </span>
      <button
        type="button"
        disabled={pagination.page >= pagination.totalPages}
        onClick={() =>
          onPage(Math.min(pagination.totalPages, pagination.page + 1))
        }
      >
        Далее
      </button>
    </nav>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="setting-toggle">
      <span>
        <b>{label}</b>
        {description && <small>{description}</small>}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <i />
    </label>
  );
}

function generateTemporaryPassword() {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = new Uint32Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join(
    "",
  );
}

function RolesPanel({ notify }: { notify: Notify }) {
  const [roles, setRoles] = useState<AccessRole[]>([]);
  const [members, setMembers] = useState<AssignableMember[]>([]);
  const [accounts, setAccounts] = useState<CompanyAccount[]>([]);
  const [accountPage, setAccountPage] = useState(1);
  const [accountSearch, setAccountSearch] = useState("");
  const [accountQuery, setAccountQuery] = useState("");
  const [accountStatus, setAccountStatus] = useState("");
  const [accountPagination, setAccountPagination] =
    useState<Pagination>(emptyPagination);
  const [memberPage, setMemberPage] = useState(1);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [memberPagination, setMemberPagination] =
    useState<Pagination>(emptyPagination);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentName, setDepartmentName] = useState("");
  const [departmentBusy, setDepartmentBusy] = useState(false);
  const [accountActionId, setAccountActionId] = useState("");
  const [editing, setEditing] = useState<AccessRole | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountRole, setAccountRole] = useState<"employee" | "manager" | "hr">(
    "employee",
  );
  const [accountDepartment, setAccountDepartment] = useState("");
  const [accountJobTitle, setAccountJobTitle] = useState("");
  const [accountAccessRole, setAccountAccessRole] = useState("");
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const editingRoleId = editing?.id ?? "";
  const load = useCallback(async () => {
    const roleParameters = new URLSearchParams({
      memberPage: String(memberPage),
    });
    if (memberQuery) roleParameters.set("memberSearch", memberQuery);
    if (editingRoleId) roleParameters.set("roleId", editingRoleId);
    const accountParameters = new URLSearchParams({
      page: String(accountPage),
    });
    if (accountQuery) accountParameters.set("search", accountQuery);
    if (accountStatus) accountParameters.set("status", accountStatus);
    const [accessData, accountData, departmentData] = await Promise.all([
      api<{
        roles: AccessRole[];
        members: AssignableMember[];
        memberPagination: Pagination;
      }>(
        `/api/admin/access-roles?${roleParameters}`,
      ),
      api<{ employees: CompanyAccount[]; pagination: Pagination }>(
        `/api/admin/users?${accountParameters}`,
      ),
      api<{ departments: Department[] }>("/api/admin/departments"),
    ]);
    setRoles(accessData.roles);
    setMembers(accessData.members);
    setMemberPagination(accessData.memberPagination);
    setSelectedMembers(
      accessData.members
        .filter((member) => member.assigned)
        .map((member) => member.membershipId),
    );
    setAccounts(accountData.employees);
    setAccountPagination(accountData.pagination);
    setDepartments(departmentData.departments);
  }, [
    accountPage,
    accountQuery,
    accountStatus,
    editingRoleId,
    memberPage,
    memberQuery,
  ]);
  useEffect(() => {
    const timer = window.setTimeout(
      () => void load().catch((e) => setError(e.message)),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAccountPage(1);
      setAccountQuery(accountSearch.trim());
    }, 350);
    return () => window.clearTimeout(timer);
  }, [accountSearch]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMemberPage(1);
      setMemberQuery(memberSearch.trim());
    }, 350);
    return () => window.clearTimeout(timer);
  }, [memberSearch]);
  const reset = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setSelected([]);
    setSelectedMembers([]);
  };
  const edit = (role: AccessRole) => {
    setEditing(role);
    setName(role.name);
    setDescription(role.description ?? "");
    setSelected(role.permissions);
    setSelectedMembers([]);
    setMemberPage(1);
    setMemberSearch("");
    setMemberQuery("");
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api<{ role: AccessRole }>(
        editing
          ? `/api/admin/access-roles/${editing.id}`
          : "/api/admin/access-roles",
        {
          method: editing ? "PATCH" : "POST",
          body: JSON.stringify({
            name,
            description: description || null,
            permissions: selected,
          }),
        },
      );
      await load();
      reset();
      notify(editing ? "Роль обновлена" : "Роль создана");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async (role: AccessRole) => {
    if (!window.confirm(`Удалить роль «${role.name}»?`)) return;
    try {
      await api(`/api/admin/access-roles/${role.id}`, { method: "DELETE" });
      await load();
      notify("Роль удалена");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const toggleRoleMember = async (
    member: AssignableMember,
    checked: boolean,
  ) => {
    if (!editing) return;
    setError("");
    try {
      await api(
        checked
          ? `/api/admin/access-roles/${editing.id}/assignments`
          : `/api/admin/access-roles/${editing.id}/assignments/${member.membershipId}`,
        checked
          ? {
              method: "POST",
              body: JSON.stringify({ membershipId: member.membershipId }),
            }
          : { method: "DELETE" },
      );
      setSelectedMembers((values) =>
        checked
          ? [...new Set([...values, member.membershipId])]
          : values.filter((item) => item !== member.membershipId),
      );
      setRoles((values) =>
        values.map((role) =>
          role.id === editing.id
            ? {
                ...role,
                assignedCount: Math.max(
                  0,
                  role.assignedCount + (checked ? 1 : -1),
                ),
              }
            : role,
        ),
      );
      setEditing((current) =>
        current
          ? {
              ...current,
              assignedCount: Math.max(
                0,
                current.assignedCount + (checked ? 1 : -1),
              ),
            }
          : current,
      );
    } catch (cause) {
      setError((cause as Error).message);
    }
  };
  const createAccount = async (event: FormEvent) => {
    event.preventDefault();
    setAccountBusy(true);
    setError("");
    setCreatedCredentials(null);
    try {
      const password = accountPassword || generateTemporaryPassword();
      const result = await api<{ membershipId: string }>("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          name: accountName,
          email: accountEmail,
          password,
          role: accountRole,
          departmentId: accountDepartment || null,
          jobTitle: accountJobTitle || null,
        }),
      });
      if (accountAccessRole) {
        await api(`/api/admin/access-roles/${accountAccessRole}/assignments`, {
          method: "POST",
          body: JSON.stringify({ membershipId: result.membershipId }),
        });
      }
      setCreatedCredentials({
        email: accountEmail.trim().toLowerCase(),
        password,
      });
      setAccountName("");
      setAccountEmail("");
      setAccountPassword("");
      setAccountRole("employee");
      setAccountDepartment("");
      setAccountJobTitle("");
      setAccountAccessRole("");
      await load();
      notify("Учётная запись создана");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAccountBusy(false);
    }
  };
  const createDepartment = async (event: FormEvent) => {
    event.preventDefault();
    setDepartmentBusy(true);
    setError("");
    try {
      const department = await api<Department>("/api/admin/departments", {
        method: "POST",
        body: JSON.stringify({ name: departmentName }),
      });
      setDepartmentName("");
      setAccountDepartment(department.id);
      await load();
      notify("Отдел создан");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDepartmentBusy(false);
    }
  };
  const toggleAccount = async (account: CompanyAccount) => {
    if (account.role === "admin") return;
    const nextStatus = account.status === "active" ? "suspended" : "active";
    setAccountActionId(account.membershipId);
    try {
      await api(`/api/admin/users/${account.membershipId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      await load();
      notify(
        nextStatus === "active"
          ? "Доступ восстановлен"
          : "Учётная запись заблокирована",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAccountActionId("");
    }
  };
  const deleteAccount = async (account: CompanyAccount) => {
    if (!window.confirm(`Удалить учётную запись ${account.name}? Это действие необратимо.`)) return;
    setAccountActionId(account.membershipId);
    setError("");
    try {
      await api(`/api/admin/users/${account.membershipId}`, { method: "DELETE" });
      await load();
      notify("Учётная запись удалена");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAccountActionId("");
    }
  };
  const copyCredentials = async () => {
    if (!createdCredentials) return;
    await navigator.clipboard.writeText(
      `PulseHub\nЛогин: ${createdCredentials.email}\nВременный пароль: ${createdCredentials.password}`,
    );
    notify("Данные для входа скопированы");
  };
  const roleLabel = {
    employee: "Сотрудник",
    manager: "Руководитель",
    hr: "HR",
    admin: "Администратор",
  };
  return (
    <div className="page-stack">
      <AdminHeading title="Учётные записи и роли" />
      {createdCredentials && (
        <div className="secret-banner account-credentials">
          <b>Учётная запись создана</b>
          <code>
            Логин: {createdCredentials.email}
            <br />
            Временный пароль: {createdCredentials.password}
          </code>
          <button type="button" onClick={() => void copyCredentials()}>
            Копировать
          </button>
        </div>
      )}
      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2>Отделы</h2>
          </div>
          <span className="count-badge">{departments.length}</span>
        </div>
        <form className="department-create-form" onSubmit={createDepartment}>
          <label>
            Название отдела
            <input
              required
              minLength={2}
              maxLength={120}
              value={departmentName}
              onChange={(event) => setDepartmentName(event.target.value)}
              placeholder="Отдел продаж"
            />
          </label>
          <button className="primary" disabled={departmentBusy}>
            {departmentBusy ? "Создаём…" : "Создать отдел"}
          </button>
        </form>
        {departments.length > 0 && (
          <div className="department-list">
            {departments.map((department) => (
              <span key={department.id}>{department.name}</span>
            ))}
          </div>
        )}
      </section>
      <div className="admin-two-column accounts-layout">
        <section className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2>Учётные записи</h2>
              <p>Доступ блокируется без удаления истории задач и начислений.</p>
            </div>
            <span className="count-badge">{accountPagination.total}</span>
          </div>
          <div className="directory-toolbar">
            <label>
              <Icon name="search" />
              <input
                type="search"
                value={accountSearch}
                onChange={(event) => setAccountSearch(event.target.value)}
                placeholder="Имя, почта или должность"
              />
            </label>
            <select
              value={accountStatus}
              onChange={(event) => {
                setAccountStatus(event.target.value);
                setAccountPage(1);
              }}
            >
              <option value="">Все статусы</option>
              <option value="active">Активные</option>
              <option value="suspended">Заблокированные</option>
            </select>
          </div>
          <div className="account-list">
            {accounts.map((account) => (
              <article
                className={`account-row ${account.status}`}
                key={account.membershipId}
              >
                <span className="account-avatar">
                  {account.name
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join("")
                    .toUpperCase()}
                </span>
                <div>
                  <h3>{account.name}</h3>
                  <p>{account.email}</p>
                  <small>
                    {account.jobTitle || "Должность не указана"} ·{" "}
                    {account.departmentName || "Без отдела"}
                  </small>
                </div>
                <span className="account-role">{roleLabel[account.role]}</span>
                <span
                  className={`integration-status ${account.status === "active" ? "active" : "paused"}`}
                >
                  {account.status === "active" ? "Активна" : "Заблокирована"}
                </span>
                {account.role === "admin" ? (
                  <span className="protected-account">Защищена</span>
                ) : (
                  <div className="account-actions">
                    <button
                      type="button"
                      disabled={accountActionId === account.membershipId}
                      className={account.status === "active" ? "account-action danger" : "account-action"}
                      onClick={() => void toggleAccount(account)}
                    >
                      {account.status === "active" ? "Заблокировать" : "Восстановить"}
                    </button>
                    <button
                      type="button"
                      disabled={accountActionId === account.membershipId}
                      className="account-action danger icon-only"
                      aria-label={`Удалить ${account.name}`}
                      onClick={() => void deleteAccount(account)}
                    >
                      <Icon name="trash" />
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
          {accountPagination.totalPages > 1 && (
            <PaginationControls
              pagination={accountPagination}
              onPage={setAccountPage}
            />
          )}
        </section>
        <form className="admin-card admin-form" onSubmit={createAccount}>
          <div className="admin-card-head">
            <div>
              <h2>Новая учётная запись</h2>
              <p>
                Создайте доступ и при необходимости сразу назначьте рабочую
                роль.
              </p>
            </div>
          </div>
          <label>
            Имя и фамилия
            <input
              required
              minLength={2}
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="Анна Смирнова"
            />
          </label>
          <label>
            Рабочая почта
            <input
              required
              type="email"
              value={accountEmail}
              onChange={(e) => setAccountEmail(e.target.value)}
              placeholder="anna@company.com"
            />
          </label>
          <div className="form-grid">
            <label>
              Системный уровень
              <select
                value={accountRole}
                onChange={(e) =>
                  setAccountRole(e.target.value as typeof accountRole)
                }
              >
                <option value="employee">Сотрудник</option>
                <option value="manager">Руководитель</option>
                <option value="hr">HR</option>
              </select>
            </label>
            <label>
              Отдел
              <select
                value={accountDepartment}
                onChange={(e) => setAccountDepartment(e.target.value)}
              >
                <option value="">Без отдела</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Должность
            <input
              maxLength={120}
              value={accountJobTitle}
              onChange={(e) => setAccountJobTitle(e.target.value)}
              placeholder="Менеджер по продажам"
            />
          </label>
          <label>
            Пользовательская роль
            <select
              value={accountAccessRole}
              onChange={(e) => setAccountAccessRole(e.target.value)}
            >
              <option value="">Без дополнительной роли</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Временный пароль
            <div className="password-admin-field">
              <input
                minLength={10}
                maxLength={128}
                value={accountPassword}
                onChange={(e) => setAccountPassword(e.target.value)}
                placeholder="Оставьте пустым для генерации"
              />
              <button
                type="button"
                onClick={() => setAccountPassword(generateTemporaryPassword())}
              >
                Сгенерировать
              </button>
            </div>
          </label>
          <button className="primary" disabled={accountBusy}>
            {accountBusy ? "Создаём…" : "Создать учётную запись"}
          </button>
        </form>
      </div>
      {error && <div className="inline-error">{error}</div>}
      <div className="admin-two-column">
        <section className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2>Роли компании</h2>
              <p>Системная роль администратора не редактируется.</p>
            </div>
            <span className="count-badge">{roles.length}</span>
          </div>
          <div className="role-list">
            <article className="role-row protected">
              <span className="role-icon">
                <Icon name="shield" />
              </span>
              <div>
                <h3>Администратор</h3>
                <p>Полный доступ к панели и трекингу активности</p>
              </div>
              <span>Системная</span>
            </article>
            {roles.map((role) => (
              <article className="role-row" key={role.id}>
                <span className="role-icon">
                  {role.name.charAt(0).toUpperCase()}
                </span>
                <div>
                  <h3>{role.name}</h3>
                  <p>
                    {role.description ||
                      `${role.permissions.length} полномочий`}
                  </p>
                </div>
                <div className="row-actions">
                  <button aria-label="Изменить" onClick={() => edit(role)}>
                    <Icon name="edit" />
                  </button>
                  <button
                    className="danger"
                    aria-label="Удалить"
                    onClick={() => void remove(role)}
                  >
                    <Icon name="trash" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
        <form className="admin-card admin-form" onSubmit={submit}>
          <div className="admin-card-head">
            <div>
              <h2>{editing ? "Изменить роль" : "Новая роль"}</h2>
              <p>Отметьте только необходимые полномочия.</p>
            </div>
          </div>
          <label>
            Название
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              placeholder="Например, Координатор мероприятий"
            />
          </label>
          <label>
            Описание
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Для чего нужна эта роль"
            />
          </label>
          <fieldset>
            <legend>Полномочия</legend>
            {permissionOptions.map(([key, label, detail]) => (
              <label className="permission-option" key={key}>
                <input
                  type="checkbox"
                  checked={selected.includes(key)}
                  onChange={(e) =>
                    setSelected((values) =>
                      e.target.checked
                        ? [...values, key]
                        : values.filter((item) => item !== key),
                    )
                  }
                />
                <span>
                  <b>{label}</b>
                  <small>{detail}</small>
                </span>
              </label>
            ))}
          </fieldset>
          {editing && (
            <fieldset>
              <legend>
                Назначения · {editing.assignedCount} сотрудников
              </legend>
              <div className="directory-toolbar compact">
                <label>
                  <Icon name="search" />
                  <input
                    type="search"
                    value={memberSearch}
                    onChange={(event) => setMemberSearch(event.target.value)}
                    placeholder="Найти сотрудника"
                  />
                </label>
              </div>
              {members.length ? (
                members.map((member) => (
                  <label
                    className="permission-option"
                    key={member.membershipId}
                  >
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(member.membershipId)}
                      onChange={(event) =>
                        void toggleRoleMember(member, event.target.checked)
                      }
                    />
                    <span>
                      <b>{member.name}</b>
                      <small>{member.jobTitle || member.email}</small>
                    </span>
                  </label>
                ))
              ) : (
                <p className="form-empty-note">Сотрудники не найдены.</p>
              )}
              {memberPagination.totalPages > 1 && (
                <PaginationControls
                  pagination={memberPagination}
                  onPage={setMemberPage}
                />
              )}
            </fieldset>
          )}
          <div className="form-actions">
            {editing && (
              <button type="button" className="secondary" onClick={reset}>
                Отмена
              </button>
            )}
            <button className="primary" disabled={busy}>
              {busy ? "Сохраняем…" : editing ? "Сохранить" : "Добавить роль"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CrmPanel({ notify }: { notify: Notify }) {
  const [items, setItems] = useState<Integration[]>([]);
  const [accounts, setAccounts] = useState<AssignableMember[]>([]);
  const [accountPage, setAccountPage] = useState(1);
  const [accountSearch, setAccountSearch] = useState("");
  const [accountQuery, setAccountQuery] = useState("");
  const [accountPagination, setAccountPagination] =
    useState<Pagination>(emptyPagination);
  const [provider, setProvider] = useState("test-crm");
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [lowPoints, setLowPoints] = useState(50);
  const [mediumPoints, setMediumPoints] = useState(100);
  const [highPoints, setHighPoints] = useState(150);
  const [error, setError] = useState("");
  const [mappingIntegration, setMappingIntegration] = useState("");
  const [mappingMember, setMappingMember] = useState("");
  const [externalUserId, setExternalUserId] = useState("");
  const [externalEmail, setExternalEmail] = useState("");
  const [mappings, setMappings] = useState<
    Array<{
      id: string;
      membershipId: string;
      externalUserId: string;
      externalEmail: string | null;
      employeeName: string;
      employeeEmail: string;
    }>
  >([]);
  const [mappingPage, setMappingPage] = useState(1);
  const [mappingSearch, setMappingSearch] = useState("");
  const [mappingQuery, setMappingQuery] = useState("");
  const [mappingPagination, setMappingPagination] =
    useState<Pagination>(emptyPagination);
  const load = useCallback(async () => {
    const parameters = new URLSearchParams({
      memberPage: String(accountPage),
    });
    if (accountQuery) parameters.set("memberSearch", accountQuery);
    const data = await api<{
      integrations: Integration[];
      members: AssignableMember[];
      memberPagination: Pagination;
    }>(`/api/admin/crm-integrations?${parameters}`);
    setItems(data.integrations);
    setAccounts(data.members);
    setAccountPagination(data.memberPagination);
    setMappingIntegration(
      (current) => current || data.integrations[0]?.id || "",
    );
  }, [accountPage, accountQuery]);
  useEffect(() => {
    const timer = window.setTimeout(
      () => void load().catch((e) => setError(e.message)),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAccountPage(1);
      setAccountQuery(accountSearch.trim());
      setMappingMember("");
    }, 350);
    return () => window.clearTimeout(timer);
  }, [accountSearch]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMappingPage(1);
      setMappingQuery(mappingSearch.trim());
    }, 350);
    return () => window.clearTimeout(timer);
  }, [mappingSearch]);
  useEffect(() => {
    if (!mappingIntegration) return;
    const parameters = new URLSearchParams({
      page: String(mappingPage),
    });
    if (mappingQuery) parameters.set("search", mappingQuery);
    void api<{ mappings: typeof mappings; pagination: Pagination }>(
      `/api/admin/crm-integrations/${mappingIntegration}/mappings?${parameters}`,
    )
      .then((data) => {
        setMappings(data.mappings);
        setMappingPagination(data.pagination);
      })
      .catch((e) => setError(e.message));
  }, [mappingIntegration, mappingPage, mappingQuery]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      const data = await api<{ id: string }>(
        "/api/admin/crm-integrations",
        {
          method: "POST",
          body: JSON.stringify({
            provider,
            name,
            baseUrl: baseUrl || null,
            defaultPoints: mediumPoints,
            config: {
              syncMode: "pull",
              pointsByPriority: {
                low: lowPoints,
                medium: mediumPoints,
                high: highPoints,
              },
            },
          }),
        },
      );
      setMappingIntegration(data.id);
      setName("");
      setBaseUrl("");
      await load();
      notify("CRM подключена");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const toggle = async (item: Integration) => {
    await api(`/api/admin/crm-integrations/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: item.status === "active" ? "paused" : "active",
      }),
    });
    await load();
    notify(
      item.status === "active"
        ? "Загрузка из CRM приостановлена"
        : "Загрузка из CRM включена",
    );
  };
  const remove = async (item: Integration) => {
    if (
      !window.confirm(
        `Удалить интеграцию «${item.name}»? История задач и начислений будет сохранена.`,
      )
    )
      return;
    try {
      await api(`/api/admin/crm-integrations/${item.id}`, { method: "DELETE" });
      await load();
      notify("Интеграция удалена");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const createMapping = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      await api(`/api/admin/crm-integrations/${mappingIntegration}/mappings`, {
        method: "POST",
        body: JSON.stringify({
          membershipId: mappingMember,
          externalUserId,
          externalEmail: externalEmail || null,
        }),
      });
      const data = await api<{
        mappings: typeof mappings;
        pagination: Pagination;
      }>(
        `/api/admin/crm-integrations/${mappingIntegration}/mappings?page=1`,
      );
      setMappings(data.mappings);
      setMappingPagination(data.pagination);
      setMappingPage(1);
      setMappingSearch("");
      setMappingQuery("");
      setMappingMember("");
      setExternalUserId("");
      setExternalEmail("");
      notify("Пользователь CRM сопоставлен");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <div className="page-stack">
      <AdminHeading title="CRM-интеграции" />
      {error && <div className="inline-error">{error}</div>}
      <div className="admin-two-column">
        <section className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2>Подключённые системы</h2>
              <p>Данные загружаются из API только по запросу платформы.</p>
            </div>
            <span className="count-badge">{items.length}</span>
          </div>
          <div className="integration-list">
            {items.length ? (
              items.map((item) => (
                <article className="integration-row" key={item.id}>
                  <span className="integration-logo">
                    {item.provider === "amocrm" ? "amo" : "API"}
                  </span>
                  <div>
                    <h3>{item.name}</h3>
                    <p>{item.baseUrl || "Адрес API не указан"}</p>
                    <small>
                      {item.lastSyncAt
                        ? `Последняя загрузка ${new Date(item.lastSyncAt).toLocaleString("ru-RU")}`
                        : "Данные ещё не загружались"}
                    </small>
                  </div>
                  <span className={`integration-status ${item.status}`}>
                    {item.status === "active" ? "Активна" : "Пауза"}
                  </span>
                  <div className="row-actions">
                    <button type="button" onClick={() => void toggle(item)}>
                      {item.status === "active" ? "Пауза" : "Включить"}
                    </button>
                    <button
                      type="button"
                      className="danger"
                      aria-label="Удалить"
                      onClick={() => void remove(item)}
                    >
                      <Icon name="trash" />
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state compact">
                <p>CRM пока не подключена.</p>
              </div>
            )}
          </div>
        </section>
        <form className="admin-card admin-form" onSubmit={submit}>
          <div className="admin-card-head">
            <div>
              <h2>Новое подключение</h2>
              <p>
                Для amoCRM укажите адрес аккаунта; для другой CRM — базовый API
                URL.
              </p>
            </div>
          </div>
          <label>
            Тип CRM
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            >
              <option value="test-crm">Локальная тестовая CRM</option>
              <option value="amocrm">amoCRM</option>
              <option value="custom">Другая CRM / Custom API</option>
            </select>
          </label>
          <label>
            Название подключения
            <input
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Основная CRM"
            />
          </label>
          <label>
            Адрес аккаунта или API
            <input
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://company.amocrm.ru"
            />
          </label>
          <fieldset>
            <legend>Очки, если CRM не передала точное значение</legend>
            <div className="form-grid">
              <label>
                Низкий приоритет
                <input
                  type="number"
                  min="0"
                  max="100000"
                  value={lowPoints}
                  onChange={(e) => setLowPoints(Number(e.target.value))}
                />
              </label>
              <label>
                Средний приоритет
                <input
                  type="number"
                  min="0"
                  max="100000"
                  value={mediumPoints}
                  onChange={(e) => setMediumPoints(Number(e.target.value))}
                />
              </label>
              <label>
                Высокий приоритет
                <input
                  type="number"
                  min="0"
                  max="100000"
                  value={highPoints}
                  onChange={(e) => setHighPoints(Number(e.target.value))}
                />
              </label>
            </div>
          </fieldset>
          <button className="primary">Создать подключение</button>
        </form>
      </div>
      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2>Сопоставление пользователей</h2>
            <p>Свяжите сотрудника PulseHub с ID пользователя во внешней CRM.</p>
          </div>
          <span className="count-badge">{mappingPagination.total}</span>
        </div>
        <div className="directory-toolbar">
          <label>
            <Icon name="search" />
            <input
              type="search"
              value={accountSearch}
              onChange={(event) => setAccountSearch(event.target.value)}
              placeholder="Найти сотрудника для сопоставления"
            />
          </label>
          <span className="directory-counter">
            {accountPagination.total} сотрудников
          </span>
        </div>
        <form className="mapping-form" onSubmit={createMapping}>
          <label>
            CRM
            <select
              required
              value={mappingIntegration}
              onChange={(e) => {
                setMappingIntegration(e.target.value);
                setMappingPage(1);
              }}
            >
              <option value="">Выберите подключение</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Сотрудник
            <select
              required
              value={mappingMember}
              onChange={(e) => setMappingMember(e.target.value)}
            >
              <option value="">Выберите сотрудника</option>
              {accounts.map((account) => (
                <option key={account.membershipId} value={account.membershipId}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            External User ID
            <input
              required
              value={externalUserId}
              onChange={(e) => setExternalUserId(e.target.value)}
              placeholder="test-crm-user-1"
            />
          </label>
          <label>
            Email в CRM
            <input
              type="email"
              value={externalEmail}
              onChange={(e) => setExternalEmail(e.target.value)}
              placeholder="employee@company.com"
            />
          </label>
          <button
            className="primary"
            disabled={!mappingIntegration || !mappingMember}
          >
            Сопоставить
          </button>
        </form>
        {accountPagination.totalPages > 1 && (
          <PaginationControls
            pagination={accountPagination}
            onPage={(value) => {
              setAccountPage(value);
              setMappingMember("");
            }}
          />
        )}
        <div className="directory-toolbar mapping-directory-toolbar">
          <label>
            <Icon name="search" />
            <input
              type="search"
              value={mappingSearch}
              onChange={(event) => setMappingSearch(event.target.value)}
              placeholder="Поиск среди сопоставлений"
            />
          </label>
        </div>
        <div className="mapping-list">
          {mappings.map((mapping) => (
            <span key={mapping.id}>
              <b>{mapping.employeeName}</b>
              <code>{mapping.externalUserId}</code>
            </span>
          ))}
        </div>
        {mappingPagination.totalPages > 1 && (
          <PaginationControls
            pagination={mappingPagination}
            onPage={setMappingPage}
          />
        )}
      </section>
    </div>
  );
}

type NotificationForm = {
  emailEnabled: boolean;
  fromName: string;
  replyTo: string | null;
  taskAssigned: boolean;
  taskDueSoon: boolean;
  taskCompleted: boolean;
  eventRegistration: boolean;
  weeklyDigest: boolean;
  digestDay: number;
  eventRecipients: string[];
};
const notificationInitial: NotificationForm = {
  emailEnabled: false,
  fromName: "PulseHub",
  replyTo: "",
  taskAssigned: true,
  taskDueSoon: true,
  taskCompleted: false,
  eventRegistration: true,
  weeklyDigest: true,
  digestDay: 1,
  eventRecipients: [],
};

function NotificationsPanel({ notify }: { notify: Notify }) {
  const [form, setForm] = useState(notificationInitial);
  const [recipients, setRecipients] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void api<{ settings: NotificationForm }>("/api/admin/notifications")
      .then(({ settings }) => {
        setForm(settings);
        setRecipients(settings.eventRecipients.join(", "));
      })
      .catch((e) => setError(e.message));
  }, []);
  const set = <K extends keyof NotificationForm>(
    key: K,
    value: NotificationForm[K],
  ) => setForm((current) => ({ ...current, [key]: value }));
  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const eventRecipients = recipients
        .split(/[,;\n]/)
        .map((v) => v.trim())
        .filter(Boolean);
      const data = await api<{ settings: NotificationForm }>(
        "/api/admin/notifications",
        {
          method: "PUT",
          body: JSON.stringify({
            ...form,
            replyTo: form.replyTo || "",
            eventRecipients,
          }),
        },
      );
      setForm(data.settings);
      notify("Настройки уведомлений сохранены");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="page-stack">
      <AdminHeading title="Уведомления" />
      {error && <div className="inline-error">{error}</div>}
      <form className="admin-settings-form" onSubmit={save}>
        <section className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2>Почтовый канал</h2>
              <p>
                Здесь задаётся логика. SMTP или почтовый провайдер подключается
                через серверные переменные.
              </p>
            </div>
          </div>
          <Toggle
            checked={form.emailEnabled}
            onChange={(v) => set("emailEnabled", v)}
            label="Отправлять email-уведомления"
            description="Главный переключатель всех почтовых сообщений"
          />
          <div className="form-grid">
            <label>
              Имя отправителя
              <input
                value={form.fromName}
                onChange={(e) => set("fromName", e.target.value)}
              />
            </label>
            <label>
              Адрес для ответа
              <input
                type="email"
                value={form.replyTo ?? ""}
                onChange={(e) => set("replyTo", e.target.value)}
                placeholder="hr@company.com"
              />
            </label>
          </div>
        </section>
        <section className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2>Задачи</h2>
              <p>События поступают из подключённой CRM.</p>
            </div>
          </div>
          <Toggle
            checked={form.taskAssigned}
            onChange={(v) => set("taskAssigned", v)}
            label="Назначена новая задача"
          />
          <Toggle
            checked={form.taskDueSoon}
            onChange={(v) => set("taskDueSoon", v)}
            label="Приближается срок выполнения"
          />
          <Toggle
            checked={form.taskCompleted}
            onChange={(v) => set("taskCompleted", v)}
            label="Задача подтверждена как завершённая"
          />
        </section>
        <section className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2>Мероприятия и дайджест</h2>
              <p>Регистрации можно направлять нескольким ответственным.</p>
            </div>
          </div>
          <Toggle
            checked={form.eventRegistration}
            onChange={(v) => set("eventRegistration", v)}
            label="Новая регистрация на мероприятие"
          />
          <label>
            Получатели регистраций
            <textarea
              rows={2}
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              placeholder="hr@company.com, manager@company.com"
            />
          </label>
          <Toggle
            checked={form.weeklyDigest}
            onChange={(v) => set("weeklyDigest", v)}
            label="Еженедельный дайджест активности"
          />
          <label>
            День отправки
            <select
              value={form.digestDay}
              onChange={(e) => set("digestDay", Number(e.target.value))}
            >
              <option value={1}>Понедельник</option>
              <option value={2}>Вторник</option>
              <option value={3}>Среда</option>
              <option value={4}>Четверг</option>
              <option value={5}>Пятница</option>
              <option value={6}>Суббота</option>
              <option value={7}>Воскресенье</option>
            </select>
          </label>
        </section>
        <div className="sticky-save">
          <button className="primary" disabled={busy}>
            {busy ? "Сохраняем…" : "Сохранить настройки"}
          </button>
        </div>
      </form>
    </div>
  );
}

function EventsAdminPanel({ notify }: { notify: Notify }) {
  const [items, setItems] = useState<AdminEvent[]>([]);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("Компания");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [capacity, setCapacity] = useState(30);
  const load = useCallback(async () => {
    const data = await api<{ events: AdminEvent[] }>("/api/admin/events");
    setItems(data.events);
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(
      () => void load().catch((e) => setError(e.message)),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [load]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await api("/api/admin/events", {
        method: "POST",
        body: JSON.stringify({
          title,
          kind,
          location,
          startsAt: new Date(startsAt).toISOString(),
          endsAt: endsAt ? new Date(endsAt).toISOString() : null,
          capacity,
        }),
      });
      setTitle("");
      setLocation("");
      setStartsAt("");
      setEndsAt("");
      await load();
      notify("Мероприятие опубликовано");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const toggle = async (item: AdminEvent) => {
    await api(`/api/admin/events/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: item.status === "published" ? "cancelled" : "published",
      }),
    });
    await load();
    notify(
      item.status === "published"
        ? "Мероприятие отменено"
        : "Мероприятие опубликовано",
    );
  };
  const remove = async (item: AdminEvent) => {
    if (!window.confirm(`Удалить «${item.title}» вместе с регистрациями?`))
      return;
    await api(`/api/admin/events/${item.id}`, { method: "DELETE" });
    await load();
    notify("Мероприятие удалено");
  };
  return (
    <div className="page-stack">
      <AdminHeading title="Управление мероприятиями" />
      {error && <div className="inline-error">{error}</div>}
      <div className="admin-two-column events-admin-layout">
        <section className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2>Все мероприятия</h2>
              <p>Включая отменённые и завершённые.</p>
            </div>
            <span className="count-badge">{items.length}</span>
          </div>
          <div className="admin-event-list">
            {items.map((item) => (
              <article key={item.id}>
                <div className="admin-event-date">
                  <b>
                    {new Date(item.startsAt).toLocaleDateString("ru-RU", {
                      day: "2-digit",
                    })}
                  </b>
                  <span>
                    {new Date(item.startsAt).toLocaleDateString("ru-RU", {
                      month: "short",
                    })}
                  </span>
                </div>
                <div>
                  <h3>{item.title}</h3>
                  <p>
                    {item.location} ·{" "}
                    {new Date(item.startsAt).toLocaleString("ru-RU")}
                  </p>
                  <small>
                    {item.registrations} регистраций из {item.capacity}
                  </small>
                </div>
                <span
                  className={`integration-status ${item.status === "published" ? "active" : "paused"}`}
                >
                  {item.status === "published" ? "Опубликовано" : "Отменено"}
                </span>
                <div className="row-actions">
                  <button onClick={() => void toggle(item)}>
                    {item.status === "published" ? "Отменить" : "Вернуть"}
                  </button>
                  <button
                    className="danger"
                    onClick={() => void remove(item)}
                    aria-label="Удалить"
                  >
                    <Icon name="trash" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
        <form className="admin-card admin-form" onSubmit={submit}>
          <div className="admin-card-head">
            <div>
              <h2>Новое мероприятие</h2>
              <p>После публикации оно появится у сотрудников.</p>
            </div>
          </div>
          <label>
            Название
            <input
              required
              minLength={2}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <div className="form-grid">
            <label>
              Категория
              <input
                required
                value={kind}
                onChange={(e) => setKind(e.target.value)}
              />
            </label>
            <label>
              Количество мест
              <input
                type="number"
                min="1"
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
              />
            </label>
          </div>
          <label>
            Место проведения
            <input
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Офис или ссылка на встречу"
            />
          </label>
          <div className="form-grid">
            <label>
              Начало
              <input
                required
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </label>
            <label>
              Окончание
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </label>
          </div>
          <button className="primary">Опубликовать</button>
        </form>
      </div>
    </div>
  );
}

function BonusesAdminPanel({ notify }: { notify: Notify }) {
  const [items, setItems] = useState<AdminBonus[]>([]);
  const [redemptions, setRedemptions] = useState<BonusRedemption[]>([]);
  const [editing, setEditing] = useState<AdminBonus | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Привилегии");
  const [price, setPrice] = useState(500);
  const [emoji, setEmoji] = useState("✦");
  const [tint, setTint] = useState<AdminBonus["tint"]>("blue");
  const [stock, setStock] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const data = await api<{
      bonuses: AdminBonus[];
      redemptions: BonusRedemption[];
    }>("/api/admin/bonuses");
    setItems(data.bonuses);
    setRedemptions(data.redemptions);
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(
      () => void load().catch((e) => setError(e.message)),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [load]);
  const reset = () => {
    setEditing(null);
    setTitle("");
    setDescription("");
    setCategory("Привилегии");
    setPrice(500);
    setEmoji("✦");
    setTint("blue");
    setStock("");
  };
  const edit = (item: AdminBonus) => {
    setEditing(item);
    setTitle(item.title);
    setDescription(item.description ?? "");
    setCategory(item.category);
    setPrice(item.price);
    setEmoji(item.emoji);
    setTint(item.tint);
    setStock(item.stock === null ? "" : String(item.stock));
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = {
        title,
        description: description || null,
        category,
        price,
        emoji,
        tint,
        stock: stock === "" ? null : Number(stock),
      };
      await api(
        editing ? `/api/admin/bonuses/${editing.id}` : "/api/admin/bonuses",
        { method: editing ? "PATCH" : "POST", body: JSON.stringify(payload) },
      );
      await load();
      reset();
      notify(editing ? "Бонус обновлён" : "Бонус добавлен в магазин");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const toggle = async (item: AdminBonus) => {
    await api(`/api/admin/bonuses/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: item.status === "active" ? "archived" : "active",
      }),
    });
    await load();
    notify(
      item.status === "active"
        ? "Бонус скрыт из магазина"
        : "Бонус возвращён в магазин",
    );
  };
  const remove = async (item: AdminBonus) => {
    if (!window.confirm(`Удалить бонус «${item.title}»?`)) return;
    try {
      await api(`/api/admin/bonuses/${item.id}`, { method: "DELETE" });
      await load();
      notify("Бонус удалён");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const updateRequest = async (
    item: BonusRedemption,
    status: "approved" | "fulfilled" | "cancelled",
  ) => {
    await api(`/api/admin/bonus-redemptions/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    await load();
    notify("Статус заявки обновлён");
  };
  const statusLabel = {
    requested: "Новая",
    approved: "Одобрена",
    fulfilled: "Выдана",
    cancelled: "Отменена",
  };
  return (
    <div className="page-stack">
      <AdminHeading title="Бонусы и заявки" />
      {error && <div className="inline-error">{error}</div>}
      <div className="admin-two-column">
        <section className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2>Каталог бонусов</h2>
              <p>
                Архивные позиции скрыты от сотрудников, история заявок
                сохраняется.
              </p>
            </div>
            <span className="count-badge">{items.length}</span>
          </div>
          <div className="bonus-admin-list">
            {items.length ? (
              items.map((item) => (
                <article className="bonus-admin-row" key={item.id}>
                  <span className={`bonus-admin-art ${item.tint}`}>
                    {item.emoji}
                  </span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>
                      {item.category} · {item.price.toLocaleString("ru-RU")} ⚡
                      ·{" "}
                      {item.stock === null
                        ? "без лимита"
                        : `остаток ${item.stock}`}
                    </p>
                    <small>{item.redemptions} заявок</small>
                  </div>
                  <span
                    className={`integration-status ${item.status === "active" ? "active" : "paused"}`}
                  >
                    {item.status === "active" ? "В магазине" : "Архив"}
                  </span>
                  <div className="row-actions">
                    <button onClick={() => edit(item)} aria-label="Изменить">
                      <Icon name="edit" />
                    </button>
                    <button onClick={() => void toggle(item)}>
                      {item.status === "active" ? "Скрыть" : "Вернуть"}
                    </button>
                    <button
                      className="danger"
                      onClick={() => void remove(item)}
                      aria-label="Удалить"
                    >
                      <Icon name="trash" />
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state compact">
                <p>Добавьте первый бонус в каталог.</p>
              </div>
            )}
          </div>
        </section>
        <form className="admin-card admin-form" onSubmit={submit}>
          <div className="admin-card-head">
            <div>
              <h2>{editing ? "Изменить бонус" : "Новый бонус"}</h2>
              <p>Остаток можно не ограничивать.</p>
            </div>
          </div>
          <label>
            Название
            <input
              required
              minLength={2}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Дополнительный выходной"
            />
          </label>
          <label>
            Описание
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Условия получения бонуса"
            />
          </label>
          <div className="form-grid">
            <label>
              Категория
              <input
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </label>
            <label>
              Стоимость
              <input
                required
                type="number"
                min="1"
                max="1000000"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
              />
            </label>
            <label>
              Значок
              <input
                required
                maxLength={12}
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
              />
            </label>
            <label>
              Цвет
              <select
                value={tint}
                onChange={(e) => setTint(e.target.value as AdminBonus["tint"])}
              >
                <option value="blue">Синий</option>
                <option value="peach">Персиковый</option>
                <option value="mint">Мятный</option>
                <option value="violet">Фиолетовый</option>
              </select>
            </label>
          </div>
          <label>
            Остаток
            <input
              type="number"
              min="0"
              max="1000000"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              placeholder="Пусто — без ограничений"
            />
          </label>
          <div className="form-actions">
            {editing && (
              <button type="button" className="secondary" onClick={reset}>
                Отмена
              </button>
            )}
            <button className="primary" disabled={busy}>
              {busy
                ? "Сохраняем…"
                : editing
                  ? "Сохранить"
                  : "Добавить в магазин"}
            </button>
          </div>
        </form>
      </div>
      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2>Заявки сотрудников</h2>
            <p>Баллы списываются в момент создания заявки.</p>
          </div>
          <span className="count-badge">{redemptions.length}</span>
        </div>
        <div className="redemption-list">
          {redemptions.length ? (
            redemptions.map((item) => (
              <article className="redemption-row" key={item.id}>
                <div>
                  <h3>{item.bonusTitle}</h3>
                  <p>
                    {item.employeeName} · {item.employeeEmail}
                  </p>
                  <small>
                    {new Date(item.createdAt).toLocaleString("ru-RU")} ·{" "}
                    {item.price.toLocaleString("ru-RU")} ⚡
                  </small>
                </div>
                <span
                  className={`integration-status ${item.status === "cancelled" ? "paused" : "active"}`}
                >
                  {statusLabel[item.status]}
                </span>
                <div className="row-actions">
                  {item.status === "requested" && (
                    <button
                      onClick={() => void updateRequest(item, "approved")}
                    >
                      Одобрить
                    </button>
                  )}
                  {["requested", "approved"].includes(item.status) && (
                    <button
                      onClick={() => void updateRequest(item, "fulfilled")}
                    >
                      Выдано
                    </button>
                  )}
                  {item.status !== "cancelled" &&
                    item.status !== "fulfilled" && (
                      <button
                        className="danger"
                        onClick={() => void updateRequest(item, "cancelled")}
                      >
                        Отменить
                      </button>
                    )}
                </div>
              </article>
            ))
          ) : (
            <div className="empty-state compact">
              <p>Заявок пока нет.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

type AiForm = {
  enabled: boolean;
  provider: string;
  model: string;
  baseUrl: string | null;
  systemPrompt: string | null;
  apiKeyLast4: string | null;
  apiKey?: string;
  clearApiKey?: boolean;
};
function AiPanel({ notify }: { notify: Notify }) {
  const [form, setForm] = useState<AiForm>({
    enabled: false,
    provider: "openai",
    model: "gpt-5-mini",
    baseUrl: "",
    systemPrompt: "",
    apiKeyLast4: null,
    apiKey: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void api<{ settings: AiForm }>("/api/admin/ai-settings")
      .then(({ settings }) => setForm({ ...settings, apiKey: "" }))
      .catch((e) => setError(e.message));
  }, []);
  const set = <K extends keyof AiForm>(key: K, value: AiForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));
  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await api<{ settings: AiForm }>("/api/admin/ai-settings", {
        method: "PUT",
        body: JSON.stringify({
          enabled: form.enabled,
          provider: form.provider,
          model: form.model,
          baseUrl: form.baseUrl || "",
          systemPrompt: form.systemPrompt || null,
          ...(form.apiKey ? { apiKey: form.apiKey } : {}),
          clearApiKey: form.clearApiKey ?? false,
        }),
      });
      setForm({ ...data.settings, apiKey: "", clearApiKey: false });
      notify("Настройки ИИ сохранены");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const models = useMemo(
    () =>
      form.provider === "openai"
        ? ["gpt-5-mini", "gpt-5", "gpt-4.1-mini"]
        : form.provider === "azure-openai"
          ? ["deployment-name"]
          : [form.model || "custom-model"],
    [form.provider, form.model],
  );
  return (
    <div className="page-stack">
      <AdminHeading title="Настройки ИИ" />
      {error && <div className="inline-error">{error}</div>}
      <form className="admin-settings-form ai-admin-form" onSubmit={save}>
        <section className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2>Доступность ассистента</h2>
              <p>Выключение скрывает ИИ-функции у обычных пользователей.</p>
            </div>
          </div>
          <Toggle
            checked={form.enabled}
            onChange={(v) => set("enabled", v)}
            label="Включить ИИ-ассистента"
            description="Доступ всё равно ограничивается ролями"
          />
        </section>
        <section className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2>Модель и подключение</h2>
              <p>
                API-ключ хранится в зашифрованном виде и никогда не возвращается
                клиенту.
              </p>
            </div>
          </div>
          <div className="form-grid">
            <label>
              Провайдер
              <select
                value={form.provider}
                onChange={(e) => set("provider", e.target.value)}
              >
                <option value="openai">OpenAI</option>
                <option value="azure-openai">Azure OpenAI</option>
                <option value="custom">Совместимый API</option>
              </select>
            </label>
            <label>
              Модель
              <input
                list="ai-models"
                value={form.model}
                onChange={(e) => set("model", e.target.value)}
              />
              <datalist id="ai-models">
                {models.map((model) => (
                  <option key={model} value={model} />
                ))}
              </datalist>
            </label>
          </div>
          <label>
            Base URL
            <input
              type="url"
              value={form.baseUrl ?? ""}
              onChange={(e) => set("baseUrl", e.target.value)}
              placeholder="Оставьте пустым для стандартного API"
            />
          </label>
          <label>
            API-ключ{" "}
            {form.apiKeyLast4 && (
              <small className="secret-hint">
                Настроен ключ ••••{form.apiKeyLast4}
              </small>
            )}
            <input
              type="password"
              autoComplete="new-password"
              value={form.apiKey ?? ""}
              onChange={(e) => set("apiKey", e.target.value)}
              placeholder={
                form.apiKeyLast4 ? "Введите новый ключ, чтобы заменить" : "sk-…"
              }
            />
          </label>
          {form.apiKeyLast4 && (
            <label className="inline-check">
              <input
                type="checkbox"
                checked={form.clearApiKey ?? false}
                onChange={(e) => set("clearApiKey", e.target.checked)}
              />{" "}
              Удалить сохранённый ключ
            </label>
          )}
        </section>
        <section className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2>Системная инструкция</h2>
              <p>Определяет контекст, границы и стиль ответов сотрудникам.</p>
            </div>
          </div>
          <label>
            Инструкция
            <textarea
              rows={9}
              value={form.systemPrompt ?? ""}
              onChange={(e) => set("systemPrompt", e.target.value)}
              placeholder="Отвечай как корпоративный помощник…"
            />
          </label>
        </section>
        <div className="sticky-save">
          <button className="primary" disabled={busy}>
            {busy ? "Сохраняем…" : "Сохранить настройки"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function AdminPanel({ page, notify }: { page: PageId; notify: Notify }) {
  if (page === "admin_crm") return <CrmPanel notify={notify} />;
  if (page === "admin_notifications")
    return <NotificationsPanel notify={notify} />;
  if (page === "admin_events") return <EventsAdminPanel notify={notify} />;
  if (page === "admin_bonuses") return <BonusesAdminPanel notify={notify} />;
  if (page === "admin_ai") return <AiPanel notify={notify} />;
  return <RolesPanel notify={notify} />;
}
