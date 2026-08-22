"use client";
import { useState } from "react";
import type { Task } from "../../types";
import { TaskCard } from "../../components/common/TaskCard";
export function TasksPage({
  tasks,
  loading,
  onRefresh,
}: {
  tasks: Task[];
  loading: boolean;
  onRefresh: () => Promise<void>;
}) {
  const [filter, setFilter] = useState("all");
  const visible =
    filter === "all" ? tasks : tasks.filter((task) => task.status === filter);
  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Синхронизация с CRM</span>
          <h1>Мои задачи</h1>
        </div>
        <button
          type="button"
          className="secondary"
          disabled={loading}
          onClick={() => void onRefresh()}
        >
          {loading ? "Обновляем…" : "Обновить задачи"}
        </button>
      </div>
      <div className="filter-bar">
        {[
          ["all", "Все"],
          ["new", "Новые"],
          ["progress", "В работе"],
          ["done", "Выполнены"],
        ].map(([id, label]) => (
          <button
            key={id}
            className={filter === id ? "active" : ""}
            onClick={() => setFilter(id)}
          >
            {label}
            <span>
              {id === "all"
                ? tasks.length
                : tasks.filter((task) => task.status === id).length}
            </span>
          </button>
        ))}
      </div>
      {loading && !tasks.length ? (
        <div className="empty-state">
          <p>Загружаем задачи из рабочего пространства…</p>
        </div>
      ) : visible.length ? (
        <div className="task-table">
          {visible.map((task, index) => (
            <TaskCard key={task.id} task={task} index={index} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h3>Задач пока нет</h3>
          <p>
            Они появятся после подключения CRM и сопоставления вашей учётной
            записи.
          </p>
        </div>
      )}
    </div>
  );
}
