"use client";

import { useState } from "react";
import { Icon } from "../../icons";

type Message = { from: "ai" | "user"; text: string };

export function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      from: "ai",
      text:
        "Здравствуйте! Я могу помочь проанализировать рабочую активность, " +
        "выполненные задачи и составить план развития.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const send = async (value = input) => {
    const text = value.trim();
    if (!text || loading) return;
    const next = [...messages, { from: "user" as const, text }];
    setMessages(next);
    setInput("");
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          messages: next.slice(-20).map((message) => ({
            role: message.from === "ai" ? "assistant" : "user",
            content: message.text,
          })),
        }),
      });
      const payload = (await response.json()) as {
        message?: string;
        error?: { message?: string };
      };
      if (!response.ok || !payload.message)
        throw new Error(payload.error?.message || "Не удалось получить ответ");
      setMessages((items) => [...items, { from: "ai", text: payload.message! }]);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    "Оцени мою рабочую активность",
    "Какие навыки мне развивать?",
    "Составь план развития на 90 дней",
  ];

  return (
    <div className="assistant-layout">
      <aside className="assistant-context">
        <span className="ai-orb">
          <Icon name="spark" />
        </span>
        <span className="eyebrow">Рабочий помощник</span>
        <h1>Анализируйте работу и развитие</h1>
        <p>
          Помощник учитывает должность, профиль и задачи, доступные в вашем
          рабочем пространстве.
        </p>
        <div className="context-note">
          <b>Важно</b>
          <p>
            Рекомендации ИИ помогают подготовиться к разговору и не заменяют
            решение человека.
          </p>
        </div>
      </aside>
      <section className="chat-panel">
        <div className="chat-header">
          <div>
            <b>ИИ-помощник</b>
            <span>
              <i /> Подключён к рабочим данным
            </span>
          </div>
        </div>
        <div className="messages">
          {messages.map((message, index) => (
            <div key={index} className={`message ${message.from}`}>
              {message.from === "ai" && (
                <span className="message-avatar">
                  <Icon name="spark" />
                </span>
              )}
              <p>{message.text}</p>
            </div>
          ))}
          {loading && <div className="typing"><i /><i /><i /></div>}
          {error && <div className="inline-error">{error}</div>}
        </div>
        <div className="suggestions">
          {suggestions.map((text) => (
            <button type="button" key={text} onClick={() => void send(text)}>
              {text}
            </button>
          ))}
        </div>
        <div className="composer">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            placeholder="Напишите вопрос..."
          />
          <button
            type="button"
            disabled={loading}
            onClick={() => void send()}
          >
            <Icon name="chevron" />
          </button>
        </div>
      </section>
    </div>
  );
}
