"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "../../icons";
import type {
  ActivityLevel,
  ActivityTrackingResponse,
  Employee,
  Role,
} from "../../types";

const levelNames = {
  green: "Высокая активность",
  yellow: "Стабильная активность",
  red: "Требуют внимания",
  unrated: "Без оценки",
};

function lastActive(value: string | null) {
  if (!value) return "нет данных";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export function ActivityTrackingPage({
  role,
  capabilities = [],
}: {
  role: Role;
  capabilities?: string[];
}) {
  const [data, setData] = useState<ActivityTrackingResponse | null>(null);
  const [departmentId, setDepartmentId] = useState("");
  const [level, setLevel] = useState<ActivityLevel>("unrated");
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [thresholds, setThresholds] = useState({
    greenMinimum: 400,
    yellowMinimum: 150,
  });
  const [opinion, setOpinion] = useState("");
  const [opinionLoading, setOpinionLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const canConfigure =
    role === "hr" ||
    role === "admin" ||
    capabilities.includes("activity.settings.manage");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const parameters = new URLSearchParams({
        level,
        page: String(page),
        pageSize: "25",
      });
      if (departmentId) parameters.set("departmentId", departmentId);
      if (searchQuery) parameters.set("search", searchQuery);
      const response = await fetch(`/api/activity?${parameters}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error();
      const payload = (await response.json()) as ActivityTrackingResponse;
      setData(payload);
      setThresholds(payload.thresholds);
      setDepartmentId((current) =>
        payload.departments.some((item) => item.id === current)
          ? current
          : (payload.departments[0]?.id ?? ""),
      );
    } catch {
      setError("Не удалось загрузить данные активности");
    } finally {
      setLoading(false);
    }
  }, [departmentId, level, page, searchQuery]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setSearchQuery(search.trim());
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);
  const department =
    data?.departments.find((item) => item.id === departmentId) ??
    data?.departments[0];
  const staff = data?.employees ?? [];

  const exportReport = async () => {
    if (!data) return;
    const parameters = new URLSearchParams({
      level,
      export: "1",
    });
    if (departmentId) parameters.set("departmentId", departmentId);
    if (searchQuery) parameters.set("search", searchQuery);
    const response = await fetch(`/api/activity?${parameters}`, {
      credentials: "include",
    });
    if (!response.ok) {
      setError("Не удалось подготовить отчёт");
      return;
    }
    const reportData =
      (await response.json()) as ActivityTrackingResponse;
    const rows = [
      [
        "Отдел",
        "Сотрудник",
        "Должность",
        "Уровень",
        "Индекс недели",
        "Динамика, %",
        "Завершено задач",
        "Последняя синхронизация",
      ],
      ...reportData.employees.map((employee) => {
        const dept = reportData.departments.find(
          (item) => item.id === employee.departmentId,
        );
        return [
          dept?.name ?? "",
          employee.name,
          employee.position,
          levelNames[employee.level],
          employee.score,
          employee.delta,
          employee.tasks,
          lastActive(employee.lastActiveAt),
        ];
      }),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `pulsehub-activity-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const saveThresholds = async () => {
    if (thresholds.greenMinimum <= thresholds.yellowMinimum) {
      setError("Порог высокой активности должен быть выше стабильной");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/activity", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(thresholds),
      });
      if (!response.ok) throw new Error();
      await load();
      setSettingsOpen(false);
    } catch {
      setError("Не удалось сохранить пороги");
    } finally {
      setSaving(false);
    }
  };

  const generateOpinion = async () => {
    if (!selected || opinionLoading) return;
    setOpinionLoading(true);
    setOpinion("");
    setError("");
    try {
      const response = await fetch(
        `/api/activity/employees/${selected.id}/opinion`,
        { method: "POST", credentials: "include" },
      );
      const payload = (await response.json()) as {
        opinion?: string;
        error?: { message?: string };
      };
      if (!response.ok || !payload.opinion)
        throw new Error(
          payload.error?.message || "Не удалось сформировать мнение",
        );
      setOpinion(payload.opinion);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setOpinionLoading(false);
    }
  };

  if (!data)
    return (
      <div className="empty-state">
        <p>{error || "Загружаем реальные показатели активности…"}</p>
      </div>
    );
  if (!department)
    return (
      <div className="empty-state">
        <h3>Нет данных для трекинга</h3>
        <p>Добавьте сотрудников в отделы и синхронизируйте задачи из CRM.</p>
      </div>
    );

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            Завершённая неделя ·{" "}
            {new Date(data.periodStart).toLocaleDateString("ru-RU")} —{" "}
            {new Date(data.periodEnd).toLocaleDateString("ru-RU")}
          </span>
          <h1>Трекинг активности</h1>
          <p>
            Индекс рассчитан по задачам, завершение которых подтверждено CRM.
          </p>
        </div>
        <button
          className="secondary"
          onClick={() => void exportReport()}
        >
          Экспорт отчёта
        </button>
      </div>
      {error && <div className="inline-error">{error}</div>}
      <div className="tracking-layout">
        <aside className="department-list">
          <h3>
            Отделы <span>{data.departments.length}</span>
          </h3>
          {data.departments.map((item) => (
            <button
              className={item.id === department.id ? "active" : ""}
              key={item.id}
              onClick={() => {
                setDepartmentId(item.id);
                setPage(1);
              }}
            >
              <span className="dept-letter">{item.name.charAt(0)}</span>
              <span>
                <b>{item.name}</b>
                <small>{item.employees} сотрудников</small>
              </span>
              <Icon name="chevron" />
            </button>
          ))}
        </aside>
        <section className="tracking-main">
          <div className="tracking-title">
            <div>
              <span className="dept-letter big">
                {department.name.charAt(0)}
              </span>
              <div>
                <h2>{department.name}</h2>
                <p>
                  Средний индекс активности <b>{department.average}</b> ·{" "}
                  {department.trend >= 0 ? "↑" : "↓"}{" "}
                  {Math.abs(department.trend)}%
                </p>
              </div>
            </div>
            {canConfigure && (
              <button onClick={() => setSettingsOpen(true)}>
                Настроить пороги
              </button>
            )}
          </div>
          <div className="level-grid">
            {(["green", "yellow", "red", "unrated"] as ActivityLevel[]).map((item) => (
              <button
                key={item}
                className={`${item} ${level === item ? "active" : ""}`}
                onClick={() => {
                  setLevel(item);
                  setPage(1);
                }}
              >
                <i />
                <strong>{department.counts[item]}</strong>
                <span>{levelNames[item]}</span>
                <small>
                  {department.employees
                    ? Math.round(
                        (department.counts[item] / department.employees) * 100,
                      )
                    : 0}
                  % отдела
                </small>
              </button>
            ))}
          </div>
          <div className="employee-section">
            <div className="employee-section-head">
              <div>
                <h2>{levelNames[level]}</h2>
                <p>
                  Показатели основаны на журнале начислений и синхронизированных
                  CRM-задачах.
                </p>
              </div>
              <div className="employee-list-tools">
                <label className="employee-search">
                  <Icon name="search" />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Найти сотрудника"
                  />
                </label>
                <span className={`level-chip ${level}`}>
                  {data.pagination.total} найдено
                </span>
              </div>
            </div>
            {loading ? (
              <div className="empty-state">
                <p>Загружаем сотрудников…</p>
              </div>
            ) : staff.length ? (
              staff.map((employee) => (
                <article className="employee-row" key={employee.id}>
                  <span className="avatar">{employee.initials}</span>
                  <div className="employee-name">
                    <h3>{employee.name}</h3>
                    <p>{employee.position}</p>
                  </div>
                  <div className="employee-metric">
                    <span>Индекс</span>
                    <b>{employee.score}</b>
                    <small className={employee.delta >= 0 ? "up" : "down"}>
                      {employee.delta >= 0 ? "+" : ""}
                      {employee.delta}%
                    </small>
                  </div>
                  <div className="employee-metric">
                    <span>Задач</span>
                    <b>{employee.tasks}</b>
                    <small>{lastActive(employee.lastActiveAt)}</small>
                  </div>
                  <div className="ai-comment">
                    <Icon name="spark" />
                    <p>{employee.insight}</p>
                  </div>
                  <button
                    className="icon-button"
                    aria-label={`Открыть данные ${employee.name}`}
                    onClick={() => {
                      setOpinion("");
                      setSelected(employee);
                    }}
                  >
                    <Icon name="chevron" />
                  </button>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <span>✓</span>
                <h3>В этой категории нет сотрудников</h3>
                <p>
                  Категория обновится при следующем недельном расчёте.
                </p>
              </div>
            )}
            {data.pagination.totalPages > 1 && (
              <nav className="employee-pagination" aria-label="Страницы сотрудников">
                <button
                  type="button"
                  disabled={data.pagination.page <= 1 || loading}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  Назад
                </button>
                <span>
                  Страница {data.pagination.page} из{" "}
                  {data.pagination.totalPages}
                </span>
                <button
                  type="button"
                  disabled={
                    data.pagination.page >= data.pagination.totalPages ||
                    loading
                  }
                  onClick={() =>
                    setPage((value) =>
                      Math.min(data.pagination.totalPages, value + 1),
                    )
                  }
                >
                  Далее
                </button>
              </nav>
            )}
          </div>
        </section>
      </div>
      {settingsOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setSettingsOpen(false)}
        >
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-label="Настройка порогов"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2>Пороги активности</h2>
            <p>
              Индекс — сумма баллов за подтверждённые CRM-задачи за последнюю
              завершённую календарную неделю.
            </p>
            <label>
              Стабильная активность от
              <input
                type="number"
                min="0"
                value={thresholds.yellowMinimum}
                onChange={(event) =>
                  setThresholds((value) => ({
                    ...value,
                    yellowMinimum: Number(event.target.value),
                  }))
                }
              />
            </label>
            <label>
              Высокая активность от
              <input
                type="number"
                min="1"
                value={thresholds.greenMinimum}
                onChange={(event) =>
                  setThresholds((value) => ({
                    ...value,
                    greenMinimum: Number(event.target.value),
                  }))
                }
              />
            </label>
            <div className="modal-actions">
              <button
                className="secondary"
                onClick={() => setSettingsOpen(false)}
              >
                Отмена
              </button>
              <button
                className="primary"
                disabled={saving}
                onClick={() => void saveThresholds()}
              >
                {saving ? "Сохраняем…" : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      )}
      {selected && (
        <div className="modal-backdrop" onMouseDown={() => { setSelected(null); setOpinion(""); }}>
          <div
            className="modal-card employee-detail"
            role="dialog"
            aria-modal="true"
            aria-label={`Данные ${selected.name}`}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="employee-detail-head">
              <span className="avatar">{selected.initials}</span>
              <div>
                <h2>{selected.name}</h2>
                <p>
                  {selected.position} · {department.name}
                </p>
              </div>
            </div>
            <dl>
              <div>
                <dt>Индекс за неделю</dt>
                <dd>{selected.score}</dd>
              </div>
              <div>
                <dt>Динамика</dt>
                <dd>
                  {selected.delta >= 0 ? "+" : ""}
                  {selected.delta}%
                </dd>
              </div>
              <div>
                <dt>Завершено CRM-задач</dt>
                <dd>{selected.tasks}</dd>
              </div>
              <div>
                <dt>Последняя синхронизация</dt>
                <dd>{lastActive(selected.lastActiveAt)}</dd>
              </div>
            </dl>
            <div className="employee-insight">
              <b>Сводка по данным</b>
              <p>{selected.insight}</p>
            </div>
            {opinion && (
              <div className="employee-insight ai-generated-opinion">
                <b>Мнение ИИ</b>
                <p>{opinion}</p>
              </div>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                disabled={opinionLoading}
                onClick={() => void generateOpinion()}
              >
                {opinionLoading ? "Формируем…" : "Сформировать мнение"}
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => {
                  setSelected(null);
                  setOpinion("");
                }}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
