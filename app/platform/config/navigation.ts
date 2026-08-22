import type { NavItem, Role } from "../types";

const employeeNavigation: NavItem[] = [
  { id: "home", label: "Главная", icon: "home" },
  { id: "tasks", label: "Задачи", icon: "tasks" },
  { id: "events", label: "Мероприятия", icon: "events" },
  { id: "store", label: "Магазин бонусов", icon: "store" },
  { id: "career", label: "AI Карьера", icon: "career" },
];

export function getNavigation(
  role: Role,
  capabilities: string[] = [],
): NavItem[] {
  if (role === "admin")
    return [
      { id: "admin_roles", label: "Доступ и роли", icon: "shield" },
      { id: "admin_crm", label: "CRM-интеграции", icon: "plug" },
      { id: "admin_notifications", label: "Уведомления", icon: "mail" },
      { id: "admin_events", label: "Мероприятия", icon: "events" },
      { id: "admin_bonuses", label: "Бонусы", icon: "store" },
      { id: "admin_ai", label: "Настройки ИИ", icon: "spark" },
      { id: "activity", label: "Трекинг активности", icon: "activity" },
    ];
  const delegated: NavItem[] = [
    ...(capabilities.includes("roles.manage")
      ? [{ id: "admin_roles" as const, label: "Доступ и роли", icon: "shield" }]
      : []),
    ...(capabilities.includes("crm.manage")
      ? [{ id: "admin_crm" as const, label: "CRM-интеграции", icon: "plug" }]
      : []),
    ...(capabilities.includes("notifications.manage")
      ? [
          {
            id: "admin_notifications" as const,
            label: "Уведомления",
            icon: "mail",
          },
        ]
      : []),
    ...(capabilities.includes("events.manage")
      ? [
          {
            id: "admin_events" as const,
            label: "Управление мероприятиями",
            icon: "events",
          },
        ]
      : []),
    ...(capabilities.includes("bonuses.manage")
      ? [
          {
            id: "admin_bonuses" as const,
            label: "Управление бонусами",
            icon: "store",
          },
        ]
      : []),
    ...(capabilities.includes("ai.manage")
      ? [{ id: "admin_ai" as const, label: "Настройки ИИ", icon: "spark" }]
      : []),
  ];
  if (!["manager", "hr"].includes(role))
    return [
      ...employeeNavigation,
      ...(capabilities.includes("activity.company.read")
        ? [
            {
              id: "activity" as const,
              label: "Трекинг активности",
              icon: "activity",
            },
          ]
        : []),
      ...delegated,
    ];
  return [
    ...employeeNavigation,
    { id: "activity", label: "Трекинг активности", icon: "activity" },
    ...delegated,
  ];
}
