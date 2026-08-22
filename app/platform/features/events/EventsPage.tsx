"use client";

import { useState } from "react";
import type { EventItem } from "../../types";

const dateFormat = new Intl.DateTimeFormat("ru-RU", { day: "2-digit" });
const monthFormat = new Intl.DateTimeFormat("ru-RU", { month: "short" });
const timeFormat = new Intl.DateTimeFormat("ru-RU", {
  hour: "2-digit",
  minute: "2-digit",
});

function EventCard({
  event,
  join,
  busy,
  completed = false,
}: {
  event: EventItem;
  join: (id: string) => Promise<void>;
  busy: boolean;
  completed?: boolean;
}) {
  const startsAt = new Date(event.startsAt);
  const full = event.attendees >= event.capacity;
  return (
    <article className={`event-card ${completed ? "completed" : ""}`}>
      <div className="date-block">
        <strong>{dateFormat.format(startsAt)}</strong>
        <span>
          {monthFormat.format(startsAt).replace(".", "").toUpperCase()}
        </span>
      </div>
      <span className="event-kind">{event.kind}</span>
      <h2>{event.title}</h2>
      <p>
        {timeFormat.format(startsAt)} · {event.location}
      </p>
      <div className="capacity">
        <span>
          {event.attendees} из {event.capacity} участников
        </span>
        <i>
          <em
            style={{
              width: `${Math.min(100, (event.attendees / event.capacity) * 100)}%`,
            }}
          />
        </i>
      </div>
      <div className="event-actions">
        <span className="event-no-points">Без начисления баллов</span>
        {completed ? (
          <span className="event-finished">Завершено</span>
        ) : event.joined ? (
          <button disabled className="joined">
            Вы участвуете
          </button>
        ) : (
          <button
            disabled={busy || full}
            className="primary"
            onClick={() => void join(event.id)}
          >
            {busy ? "Записываем…" : full ? "Мест нет" : "Записаться"}
          </button>
        )}
      </div>
    </article>
  );
}

function EventSection({
  title,
  events,
  join,
  busyId,
  completed,
}: {
  title: string;
  events: EventItem[];
  join: (id: string) => Promise<void>;
  busyId: string | null;
  completed?: boolean;
}) {
  return (
    <section className="event-section">
      <div className="event-section-title">
        <h2>{title}</h2>
        <span>{events.length}</span>
      </div>
      {events.length ? (
        <div className="events-grid">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              join={join}
              busy={busyId === event.id}
              completed={completed}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state compact">
          <p>В этом разделе пока нет мероприятий.</p>
        </div>
      )}
    </section>
  );
}

export function EventsPage({
  events,
  join,
}: {
  events: EventItem[];
  join: (id: string) => Promise<void>;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const upcoming = events.filter(
    (event) => new Date(event.endsAt ?? event.startsAt).getTime() >= now,
  );
  const joined = upcoming.filter((event) => event.joined);
  const available = upcoming.filter((event) => !event.joined);
  const completed = events
    .filter((event) => new Date(event.endsAt ?? event.startsAt).getTime() < now)
    .sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));
  const register = async (id: string) => {
    setBusyId(id);
    try {
      await join(id);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Календарь компании</span>
          <h1>Мероприятия</h1>
          <p>Регистрируйтесь на встречи и следите за расписанием компании.</p>
        </div>
      </div>
      <EventSection
        title="Вы записаны"
        events={joined}
        join={register}
        busyId={busyId}
      />
      <EventSection
        title="Доступные мероприятия"
        events={available}
        join={register}
        busyId={busyId}
      />
      <EventSection
        title="Завершённые"
        events={completed}
        join={register}
        busyId={busyId}
        completed
      />
    </div>
  );
}
