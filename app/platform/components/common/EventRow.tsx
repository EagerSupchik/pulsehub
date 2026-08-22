import type { EventItem } from "../../types";

const dayFormat = new Intl.DateTimeFormat("ru-RU", { day: "2-digit" });
const monthFormat = new Intl.DateTimeFormat("ru-RU", { month: "short" });
const timeFormat = new Intl.DateTimeFormat("ru-RU", {
  hour: "2-digit",
  minute: "2-digit",
});

export function EventRow({ event }: { event: EventItem }) {
  const date = new Date(event.startsAt);
  return (
    <article className="event-row">
      <div className="date-block">
        <strong>{dayFormat.format(date)}</strong>
        <span>{monthFormat.format(date).replace(".", "").toUpperCase()}</span>
      </div>
      <div>
        <span>{event.kind}</span>
        <h3>{event.title}</h3>
        <p>
          {timeFormat.format(date)} · {event.location}
        </p>
      </div>
      <div className="attendees">
        <span className="mini-avatars">
          <i>•</i>
          <i>•</i>
          <i>+</i>
        </span>
        <small>{event.attendees} участников</small>
      </div>
      <span
        className={
          event.joined ? "home-event-state joined-text" : "home-event-state"
        }
      >
        {event.joined ? "Вы участвуете" : "Доступно"}
      </span>
    </article>
  );
}
