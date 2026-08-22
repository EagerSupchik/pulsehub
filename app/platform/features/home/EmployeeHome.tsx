import { Icon } from "../../icons";
import type { EventItem, PageId, Task, User } from "../../types";
import { EventRow } from "../../components/common/EventRow";
import { SectionTitle } from "../../components/common/SectionTitle";
import { TaskCard } from "../../components/common/TaskCard";

interface Props {
  user: User;
  tasks: Task[];
  events: EventItem[];
  wallet: number;
  navigate: (page: PageId) => void;
}
export function EmployeeHome({ user, tasks, events, wallet, navigate }: Props) {
  const active = tasks.filter((task) => task.status !== "done");
  const firstName = user.name.split(" ")[0];
  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Сегодня</span>
          <h1>
            Доброе утро, {firstName} <span>👋</span>
          </h1>
          <p>Вот что происходит в вашем рабочем пространстве сегодня.</p>
        </div>
      </div>
      <section className="hero-grid">
        <article className="profile-hero">
          <div className="hero-top">
            <div className="avatar large">
              {user.initials}
              <i />
            </div>
            <div>
              <span className="hero-kicker">Мой профиль</span>
              <h2>{user.name}</h2>
              <p>
                {user.position} · {user.department}
              </p>
            </div>
            <button className="ghost-pill">Уровень 8</button>
          </div>
          <div className="score-row">
            <div>
              <span>Очки активности</span>
              <strong>{user.activityPoints.toLocaleString("ru-RU")}</strong>
              <small>↑ 12% за месяц</small>
            </div>
            <div>
              <span>Можно потратить</span>
              <strong>{wallet.toLocaleString("ru-RU")}</strong>
              <small>баллов в магазине</small>
            </div>
          </div>
          <div className="level-progress">
            <span>До уровня «Мастер»</span>
            <b>386 баллов</b>
            <i>
              <em style={{ width: "72%" }} />
            </i>
          </div>
        </article>
        <article className="career-card">
          <div className="career-icon">
            <Icon name="spark" />
          </div>
          <span className="eyebrow light">AI-карьерный помощник</span>
          <h2>Ваш следующий шаг уже виден</h2>
          <p>
            На основе текущих навыков мы подготовили 3 персональные
            рекомендации.
          </p>
          <button onClick={() => navigate("career")}>
            Открыть траекторию <Icon name="chevron" />
          </button>
          <div className="orb one" />
          <div className="orb two" />
        </article>
      </section>
      <section>
        <SectionTitle
          icon="tasks"
          title="Мои задачи"
          action="Все задачи"
          onClick={() => navigate("tasks")}
        />
        <div className="card-grid tasks-preview">
          {active.slice(0, 3).map((task, index) => (
            <TaskCard key={task.id} task={task} index={index} />
          ))}
        </div>
      </section>
      <section>
        <SectionTitle
          icon="events"
          title="Ближайшие мероприятия"
          action="Календарь"
          onClick={() => navigate("events")}
        />
        <div className="event-list">
          {events.slice(0, 2).map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
        </div>
      </section>
    </div>
  );
}
