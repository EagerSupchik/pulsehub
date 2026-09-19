export const personalityStyles = [
  "explorer",
  "organizer",
  "connector",
  "supporter",
  "stabilizer",
] as const;

export type PersonalityStyle = (typeof personalityStyles)[number];
export type PersonalityTrait =
  | "openness"
  | "conscientiousness"
  | "extraversion"
  | "agreeableness"
  | "emotionalStability";

export const personalityStyleDetails: Record<
  PersonalityStyle,
  { label: string; trait: PersonalityTrait; description: string; recommendation: string }
> = {
  explorer: {
    label: "Исследователь",
    trait: "openness",
    description: "Сильнее вовлекается в задачи с поиском новых решений и экспериментами.",
    recommendation: "Давайте пространство для идей, прототипов и выбора способа решения.",
  },
  organizer: {
    label: "Организатор",
    trait: "conscientiousness",
    description: "Предпочитает ясные цели, структуру и измеримый результат.",
    recommendation: "Фиксируйте критерии готовности, сроки и последовательность этапов.",
  },
  connector: {
    label: "Коммуникатор",
    trait: "extraversion",
    description: "Получает энергию от взаимодействия, обсуждений и публичных задач.",
    recommendation: "Используйте встречи, презентации и совместную работу.",
  },
  supporter: {
    label: "Партнёр",
    trait: "agreeableness",
    description: "Ориентирован на сотрудничество, поддержку и общий результат команды.",
    recommendation: "Подчёркивайте пользу для команды и давайте задачи с взаимопомощью.",
  },
  stabilizer: {
    label: "Стабилизатор",
    trait: "emotionalStability",
    description: "Сохраняет рабочий ритм при изменениях и напряжённой нагрузке.",
    recommendation: "Подключайте к задачам, где важны устойчивость и спокойная реакция.",
  },
};

export const personalityQuestions = [
  { id: "o1", trait: "openness", text: "Мне интересно находить новые способы решения рабочих задач.", reverse: false },
  { id: "o2", trait: "openness", text: "Я охотно пробую новые инструменты и подходы.", reverse: false },
  { id: "o3", trait: "openness", text: "Я предпочитаю знакомые решения экспериментам.", reverse: true },
  { id: "c1", trait: "conscientiousness", text: "Я заранее планирую этапы работы.", reverse: false },
  { id: "c2", trait: "conscientiousness", text: "Я внимательно проверяю результат перед сдачей.", reverse: false },
  { id: "c3", trait: "conscientiousness", text: "Мне сложно придерживаться установленного порядка.", reverse: true },
  { id: "e1", trait: "extraversion", text: "Мне комфортно активно обсуждать идеи с коллегами.", reverse: false },
  { id: "e2", trait: "extraversion", text: "Я охотно выступаю и представляю результаты.", reverse: false },
  { id: "e3", trait: "extraversion", text: "После большого количества общения мне трудно сохранять энергию.", reverse: true },
  { id: "a1", trait: "agreeableness", text: "Мне важно помогать коллегам достигать общего результата.", reverse: false },
  { id: "a2", trait: "agreeableness", text: "Я стараюсь учитывать интересы участников команды.", reverse: false },
  { id: "a3", trait: "agreeableness", text: "В спорной ситуации результат важнее отношений.", reverse: true },
  { id: "s1", trait: "emotionalStability", text: "Я сохраняю спокойствие при срочных изменениях.", reverse: false },
  { id: "s2", trait: "emotionalStability", text: "После сложной ситуации я быстро возвращаюсь к рабочему ритму.", reverse: false },
  { id: "s3", trait: "emotionalStability", text: "Неопределённость надолго выбивает меня из рабочего состояния.", reverse: true },
] as const satisfies ReadonlyArray<{
  id: string;
  trait: PersonalityTrait;
  text: string;
  reverse?: boolean;
}>;

export const workStyleLabels: Record<PersonalityStyle, string> = {
  explorer: "Новые решения",
  organizer: "Структура и точность",
  connector: "Коммуникация",
  supporter: "Командная поддержка",
  stabilizer: "Устойчивость к изменениям",
};
