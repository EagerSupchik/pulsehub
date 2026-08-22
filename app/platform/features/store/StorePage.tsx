"use client";
import { useState } from "react";
import type { RewardItem } from "../../types";
export function StorePage({
  wallet,
  rewards,
  buy,
}: {
  wallet: number;
  rewards: RewardItem[];
  buy: (reward: RewardItem) => void | Promise<void>;
}) {
  const [category, setCategory] = useState("Все");
  const categories = ["Все", ...new Set(rewards.map((item) => item.category))];
  const visible =
    category === "Все"
      ? rewards
      : rewards.filter((item) => item.category === category);
  return (
    <div className="page-stack">
      <div className="store-heading">
        <div>
          <span className="eyebrow light">Магазин бонусов</span>
          <h1>
            Обменивайте активность
            <br />
            на приятные бонусы
          </h1>
          <p>Мерч и корпоративные привилегии за накопленные баллы.</p>
        </div>
        <div className="wallet">
          <span>Доступно баллов</span>
          <strong>{wallet.toLocaleString("ru-RU")} ⚡</strong>
        </div>
      </div>
      <div className="filter-bar light">
        {categories.map((item) => (
          <button
            key={item}
            className={category === item ? "active" : ""}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>
      {visible.length ? (
        <div className="store-grid">
          {visible.map((item) => {
            const unavailable = item.stock === 0;
            return (
              <article className="product-card" key={item.id}>
                <div className={`product-art ${item.tint}`}>
                  <span>{item.emoji}</span>
                </div>
                <p>
                  {item.category}
                  {item.stock !== null && item.stock !== undefined
                    ? ` · осталось ${item.stock}`
                    : ""}
                </p>
                <h2>{item.title}</h2>
                {item.description && (
                  <p className="product-description">{item.description}</p>
                )}
                <div>
                  <strong>{item.price.toLocaleString("ru-RU")} ⚡</strong>
                  <button
                    onClick={() => void buy(item)}
                    disabled={wallet < item.price || unavailable}
                  >
                    {unavailable
                      ? "Закончился"
                      : wallet < item.price
                        ? "Не хватает"
                        : "Получить"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <h3>Бонусов пока нет</h3>
          <p>
            Каталог появится после того, как администратор добавит первые
            бонусы.
          </p>
        </div>
      )}
    </div>
  );
}
