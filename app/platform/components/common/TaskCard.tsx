import { Icon } from "../../icons";
import type { Task } from "../../types";

function formatTaskDate(task: Task) {
  const value = task.status === "done" ? task.completedAt : task.dueAt;
  if (!value) return task.status === "done" ? "Выполнено в CRM" : "Без срока";
  const date = new Date(value);
  return `${task.status === "done" ? "Выполнено" : "До"} ${new Intl.DateTimeFormat(
    "ru-RU",
    {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date)}`;
}

export function TaskCard({ task, index }: { task: Task; index: number }) {
  const labels = {
    new: "Новая",
    progress: "В работе",
    done: "Выполнена",
    cancelled: "Отменена",
  };
  const content = (
    <>
      <div className={`task-symbol s${index % 3}`}>
        <Icon name={task.status === "done" ? "check" : "tasks"} />
      </div>
      <div className="task-body">
        <div className="task-meta">
          <span>{task.project || task.sourceName || "CRM"}</span>
          <b>{task.points > 0 ? `+${task.points} ⚡` : "Без баллов"}</b>
        </div>
        <h3>{task.title}</h3>
        <div className="task-footer">
          <span className={`status ${task.status}`}>{labels[task.status]}</span>
          <span>{formatTaskDate(task)}</span>
        </div>
        {Boolean(task.personalityBonus) && (
          <div className="task-bonus">Персональный бонус +{task.personalityBonus}</div>
        )}
      </div>
      {task.sourceUrl && (
        <span className="task-source-link" title="Открыть задачу в CRM">
          ↗
        </span>
      )}
    </>
  );
  return task.sourceUrl ? (
    <a
      className={`task-card ${task.status}`}
      href={task.sourceUrl}
      target="_blank"
      rel="noreferrer"
    >
      {content}
    </a>
  ) : (
    <article className={`task-card ${task.status}`}>{content}</article>
  );
}
