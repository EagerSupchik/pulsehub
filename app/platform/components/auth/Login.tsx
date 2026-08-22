"use client";

import Image from "next/image";
import { useState } from "react";
import { Icon } from "../../icons";

interface Props {
  error?: string;
  onLogin: (credentials: {
    email: string;
    password: string;
    rememberMe: boolean;
  }) => Promise<void>;
}

export function Login({ error, onLogin }: Props) {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      await onLogin({ email, password, rememberMe });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <section className="login-story">
        <div className="story-brand">
          <Image
            className="brand-logo"
            src="/favicon.svg"
            width={42}
            height={42}
            alt=""
            priority
          />
          pulse
        </div>
      </section>
      <section className="login-panel">
        <form onSubmit={submit}>
          <div className="mobile-brand">
            <Image
              className="brand-logo"
              src="/favicon.svg"
              width={38}
              height={38}
              alt=""
              priority
            />
            pulse
          </div>
          <span className="eyebrow">Корпоративный доступ</span>
          <h2>Добро пожаловать</h2>
          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}
          <label>
            Рабочая почта
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label>
            Пароль
            <span className="password-wrap">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? "Скрыть" : "Показать"}
              </button>
            </span>
          </label>
          <div className="login-help">
            <label className="check">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
              />{" "}
              Запомнить меня
            </label>
          </div>
          <button className="primary wide" disabled={loading}>
            {loading ? "Входим…" : "Войти в пространство"}
            <Icon name="chevron" />
          </button>
        </form>
      </section>
    </div>
  );
}
