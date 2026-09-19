"use client";

import { useCallback, useEffect, useState } from "react";

type Trait =
  | "openness"
  | "conscientiousness"
  | "extraversion"
  | "agreeableness"
  | "emotionalStability";

type Profile = {
  primaryStyle: string;
  shareWithManagers: boolean;
  style: {
    label: string;
    description: string;
    recommendation: string;
  };
  scores: Record<Trait, number>;
};

type Assessment = {
  questions: Array<{ id: string; text: string }>;
  profile: Profile | null;
};

const traitLabels: Record<Trait, string> = {
  openness: "Открытость новому",
  conscientiousness: "Организованность",
  extraversion: "Коммуникация",
  agreeableness: "Сотрудничество",
  emotionalStability: "Эмоциональная устойчивость",
};

const answerLabels = [
  "Совсем не похоже",
  "Скорее не похоже",
  "Иногда",
  "Скорее похоже",
  "Очень похоже",
];

export function PersonalityPage({ notify }: { notify: (message: string) => void }) {
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [shareWithManagers, setShareWithManagers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/personality", { credentials: "include" });
      if (!response.ok) throw new Error("Не удалось загрузить оценку");
      const payload = (await response.json()) as Assessment;
      setAssessment(payload);
      setShareWithManagers(payload.profile?.shareWithManagers ?? false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/personality", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Не удалось загрузить оценку");
        return (await response.json()) as Assessment;
      })
      .then((payload) => {
        if (!active) return;
        setAssessment(payload);
        setShareWithManagers(payload.profile?.shareWithManagers ?? false);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const submit = async () => {
    if (!assessment || Object.keys(answers).length !== assessment.questions.length) {
      notify("Ответьте на все вопросы");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/personality", {
        method: "PUT",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ answers, consent: true, shareWithManagers }),
      });
      if (!response.ok) throw new Error("Не удалось сохранить результат");
      await load();
      setAnswers({});
      notify("Рабочий профиль обновлён");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="empty-state">Загружаем оценку…</div>;
  if (!assessment) return <div className="empty-state">Оценка недоступна</div>;

  return (
    <div className="page-stack personality-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Рабочий профиль</span>
          <h1>Мой стиль работы</h1>
          <p>15 вопросов · результат используется только для персональных бонусов до 10%</p>
        </div>
      </div>

      {assessment.profile && (
        <section className="personality-result">
          <div>
            <span className="eyebrow light">Ведущий стиль</span>
            <h2>{assessment.profile.style.label}</h2>
            <p>{assessment.profile.style.description}</p>
            <strong>{assessment.profile.style.recommendation}</strong>
          </div>
          <div className="trait-list">
            {(Object.entries(assessment.profile.scores) as Array<[Trait, number]>).map(
              ([trait, score]) => (
                <div className="trait-row" key={trait}>
                  <span>{traitLabels[trait]}</span>
                  <div><i style={{ width: `${score}%` }} /></div>
                  <b>{score}</b>
                </div>
              ),
            )}
          </div>
        </section>
      )}

      <section className="assessment-card">
        <h2>{assessment.profile ? "Пройти повторно" : "Пройти оценку"}</h2>
        <div className="question-list">
          {assessment.questions.map((question, index) => (
            <fieldset key={question.id}>
              <legend>{index + 1}. {question.text}</legend>
              <div className="answer-scale">
                {answerLabels.map((label, answerIndex) => {
                  const value = answerIndex + 1;
                  return (
                    <label key={value}>
                      <input
                        type="radio"
                        name={question.id}
                        checked={answers[question.id] === value}
                        onChange={() => setAnswers((current) => ({ ...current, [question.id]: value }))}
                      />
                      <span>{value}</span>
                      <small>{label}</small>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
        <label className="consent-row">
          <input
            type="checkbox"
            checked={shareWithManagers}
            onChange={(event) => setShareWithManagers(event.target.checked)}
          />
          Показывать мой ведущий рабочий стиль руководителю и HR
        </label>
        <div className="assessment-actions">
          <span>Базовые баллы за одинаковую работу остаются одинаковыми для всех.</span>
          <button className="primary" type="button" disabled={saving} onClick={() => void submit()}>
            {saving ? "Сохраняем…" : "Получить результат"}
          </button>
        </div>
      </section>
    </div>
  );
}
