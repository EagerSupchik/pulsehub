import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { hashPassword } from "better-auth/crypto";
import postgres from "postgres";

const requiredEnvironment = ["DATABASE_URL"];

for (const key of requiredEnvironment) {
  if (!process.env[key]?.trim()) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const seedConfig = {
  companyName: process.env.SEED_COMPANY_NAME?.trim() || "SupchikCompany",
  companySlug:
    process.env.SEED_COMPANY_SLUG?.trim().toLowerCase() ||
    "supchik-company",
  password: process.env.SEED_PASSWORD || "PulseHub2026!",
  reset: process.env.SEED_RESET?.toLowerCase() === "true",
};

if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(seedConfig.companySlug)) {
  throw new Error(
    "SEED_COMPANY_SLUG must contain lowercase letters, digits and single hyphens",
  );
}

if (seedConfig.password.length < 12) {
  throw new Error("SEED_PASSWORD must contain at least 12 characters");
}

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const now = new Date();

function stableId(scope, key) {
  const hex = createHash("sha256")
    .update(`${seedConfig.companySlug}:${scope}:${key}`, "utf8")
    .digest("hex")
    .slice(0, 32);

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `8${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join("-");
}

function daysFromNow(days, hour = 10) {
  const value = new Date(now);
  value.setUTCDate(value.getUTCDate() + days);
  value.setUTCHours(hour, 0, 0, 0);
  return value;
}

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addDays(date, days, hour = date.getUTCHours()) {
  const value = new Date(date);
  value.setUTCDate(value.getUTCDate() + days);
  value.setUTCHours(hour, 0, 0, 0);
  return value;
}

function startOfUtcWeek(date) {
  const value = new Date(date);
  const daysSinceMonday = (value.getUTCDay() + 6) % 7;
  value.setUTCDate(value.getUTCDate() - daysSinceMonday);
  value.setUTCHours(0, 0, 0, 0);
  return value;
}

const currentWeekStart = startOfUtcWeek(now);
const completedWeekStart = addDays(currentWeekStart, -7, 0);
const previousWeekStart = addDays(currentWeekStart, -14, 0);

function hashSyncSecret(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function encryptAiKey(value) {
  if (!value) {
    return null;
  }

  const configuredKey = process.env.PULSEHUB_ENCRYPTION_KEY;
  if (!configuredKey) {
    throw new Error(
      "PULSEHUB_ENCRYPTION_KEY is required when SEED_AI_API_KEY is set",
    );
  }

  const key = createHash("sha256")
    .update(configuredKey, "utf8")
    .digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [iv, tag, encrypted]
    .map((part) => part.toString("base64url"))
    .join(".");
}

const departmentDefinitions = [
  { key: "administration", name: "Администрация" },
  { key: "sales", name: "Продажи" },
  { key: "support", name: "Клиентский сервис" },
  { key: "development", name: "Разработка" },
  { key: "marketing", name: "Маркетинг" },
  { key: "hr", name: "HR" },
];

const memberDefinitions = [
  {
    key: "admin",
    name: "Алексей Морозов",
    email: "admin@supchik.com",
    role: "admin",
    department: "administration",
    jobTitle: "Системный администратор",
  },
  {
    key: "hr",
    name: "Анна Воронова",
    email: "hr@supchik.com",
    role: "hr",
    department: "hr",
    jobTitle: "HR business partner",
  },
  {
    key: "sales-manager",
    name: "Дмитрий Соколов",
    email: "d.sokolov@supchik.com",
    role: "manager",
    department: "sales",
    jobTitle: "Руководитель отдела продаж",
  },
  {
    key: "support-manager",
    name: "Мария Лебедева",
    email: "m.lebedeva@supchik.com",
    role: "manager",
    department: "support",
    jobTitle: "Руководитель клиентского сервиса",
  },
  {
    key: "development-manager",
    name: "Сергей Ким",
    email: "s.kim@supchik.com",
    role: "manager",
    department: "development",
    jobTitle: "Руководитель разработки",
  },
  {
    key: "anna-smirnova",
    name: "Анна Смирнова",
    email: "anna@supchik.com",
    role: "employee",
    department: "sales",
    jobTitle: "Менеджер по работе с ключевыми клиентами",
  },
  {
    key: "ivan-petrov",
    name: "Иван Петров",
    email: "ivan@supchik.com",
    role: "employee",
    department: "sales",
    jobTitle: "Менеджер по продажам",
  },
  {
    key: "ekaterina-orlova",
    name: "Екатерина Орлова",
    email: "e.orlova@supchik.com",
    role: "employee",
    department: "support",
    jobTitle: "Специалист клиентского сервиса",
  },
  {
    key: "maxim-volkov",
    name: "Максим Волков",
    email: "m.volkov@supchik.com",
    role: "employee",
    department: "support",
    jobTitle: "Специалист технической поддержки",
  },
  {
    key: "olga-romanova",
    name: "Ольга Романова",
    email: "o.romanova@supchik.com",
    role: "employee",
    department: "marketing",
    jobTitle: "Маркетолог",
  },
  {
    key: "roman-fedorov",
    name: "Роман Фёдоров",
    email: "r.fedorov@supchik.com",
    role: "employee",
    department: "development",
    jobTitle: "Backend-разработчик",
  },
  {
    key: "nikita-kozlov",
    name: "Никита Козлов",
    email: "n.kozlov@supchik.com",
    role: "employee",
    department: "development",
    jobTitle: "Junior frontend-разработчик",
  },
];

const generatedFirstNames = [
  "Александр",
  "Елена",
  "Михаил",
  "Дарья",
  "Артём",
  "София",
  "Павел",
  "Виктория",
  "Илья",
  "Алина",
  "Денис",
  "Наталья",
];
const generatedLastNames = [
  "Белов",
  "Громова",
  "Захаров",
  "Исаева",
  "Карпов",
  "Ларионова",
  "Мельников",
  "Николаева",
  "Осипов",
  "Панина",
  "Рыбаков",
  "Савельева",
  "Титов",
  "Уварова",
  "Фомин",
  "Харитонова",
  "Цветков",
  "Чернова",
  "Широков",
  "Яковлева",
];
const generatedDepartmentCycle = [
  "sales",
  "support",
  "development",
  "marketing",
];
const generatedJobTitles = {
  sales: [
    "Менеджер по продажам",
    "Менеджер по работе с клиентами",
    "Специалист по развитию бизнеса",
  ],
  support: [
    "Специалист клиентского сервиса",
    "Специалист технической поддержки",
    "Менеджер по сопровождению клиентов",
  ],
  development: [
    "Frontend-разработчик",
    "Backend-разработчик",
    "Инженер по тестированию",
  ],
  marketing: [
    "Маркетолог",
    "Контент-менеджер",
    "Специалист по аналитике рекламы",
  ],
};

const generatedMembers = Array.from({ length: 48 }, (_, index) => {
  const sequence = index + 1;
  const department =
    generatedDepartmentCycle[index % generatedDepartmentCycle.length];
  return {
    key: `staff-${String(sequence).padStart(2, "0")}`,
    name: `${generatedFirstNames[index % generatedFirstNames.length]} ${generatedLastNames[index % generatedLastNames.length]}`,
    email: `staff${String(sequence).padStart(2, "0")}@supchik.com`,
    role: "employee",
    department,
    jobTitle:
      generatedJobTitles[department][
        Math.floor(index / generatedDepartmentCycle.length) %
          generatedJobTitles[department].length
      ],
  };
});

memberDefinitions.push(...generatedMembers);

const activityPlans = {
  admin: {
    current: [250, 220, 200, 180],
    previous: [250, 220, 180],
  },
  hr: {
    current: [180, 160, 140, 120],
    previous: [160, 140, 120],
  },
  "sales-manager": {
    current: [250, 220, 180, 160],
    previous: [250, 220, 200, 180],
  },
  "support-manager": {
    current: [200, 180, 160, 140],
    previous: [160, 140, 120],
  },
  "development-manager": {
    current: [250, 250, 220, 200],
    previous: [250, 220, 200],
  },
  "anna-smirnova": {
    current: [250, 200, 180, 160, 140, 120],
    previous: [180, 160, 140, 120],
  },
  "ivan-petrov": {
    current: [180, 140, 120],
    previous: [250, 200, 160],
  },
  "ekaterina-orlova": {
    current: [250, 220, 200, 180],
    previous: [220, 200, 180, 160],
  },
  "maxim-volkov": {
    current: [120, 100],
    previous: [160, 140, 120],
  },
  "olga-romanova": {
    current: [250, 200, 180, 160, 140],
    previous: [200, 180, 160, 140],
  },
  "roman-fedorov": {
    current: [250, 250, 220, 200, 180],
    previous: [250, 220, 200, 180],
  },
  "nikita-kozlov": {
    current: [],
    previous: [],
  },
};

for (const [index, member] of generatedMembers.entries()) {
  const profile = index % 5;
  activityPlans[member.key] =
    profile === 0
      ? { current: [250, 220, 180], previous: [220, 180, 140] }
      : profile === 1
        ? { current: [220, 180, 140], previous: [250, 220, 180] }
        : profile === 2
          ? { current: [140, 120], previous: [180, 140] }
          : profile === 3
            ? { current: [120], previous: [140, 120] }
            : { current: [], previous: [] };
}

const taskTitles = {
  administration: [
    "Проверить права доступа к рабочему пространству",
    "Обновить регламент резервного копирования",
    "Провести аудит настроек интеграций",
  ],
  hr: [
    "Подготовить план адаптации новых сотрудников",
    "Согласовать программу внутреннего обучения",
    "Обновить матрицу компетенций",
  ],
  sales: [
    "Подготовить коммерческое предложение",
    "Провести встречу с ключевым клиентом",
    "Обновить прогноз продаж",
    "Проверить сделки без следующего шага",
  ],
  support: [
    "Закрыть обращения с высоким приоритетом",
    "Подготовить отчёт по клиентским обращениям",
    "Провести разбор причин повторных обращений",
    "Обновить базу знаний поддержки",
  ],
  development: [
    "Завершить интеграцию с API партнёра",
    "Исправить ошибки из очереди релиза",
    "Подготовить сервис к нагрузочному тестированию",
    "Провести ревью изменений модуля аналитики",
  ],
  marketing: [
    "Подготовить аналитику рекламной кампании",
    "Согласовать контент-план на месяц",
    "Обновить сегменты email-рассылки",
  ],
};

const openTaskTemplates = {
  administration: [
    "Настроить еженедельный аудит доступов",
    "Проверить журнал административных действий",
  ],
  hr: [
    "Подготовить встречу по итогам испытательного срока",
    "Собрать обратную связь после адаптации",
  ],
  sales: [
    "Согласовать условия пилотного проекта",
    "Подготовить отчёт по воронке продаж",
  ],
  support: [
    "Разобрать обращения с низкой оценкой CSAT",
    "Обновить шаблоны ответов клиентам",
  ],
  development: [
    "Подготовить релиз модуля уведомлений",
    "Проверить мониторинг CRM-синхронизации",
  ],
  marketing: [
    "Запустить кампанию для корпоративных клиентов",
    "Подготовить кейс о результатах внедрения",
  ],
};

const accessRoleDefinitions = [
  {
    key: "team-lead",
    name: "Руководитель команды",
    description: "Просмотр активности команды и регистраций на мероприятия",
    permissions: [
      "activity.company.read",
      "events.registrations.read",
    ],
    members: [
      "sales-manager",
      "support-manager",
      "development-manager",
    ],
  },
  {
    key: "hr-coordinator",
    name: "HR-координатор",
    description: "Сотрудники, мероприятия, бонусы и настройки активности",
    permissions: [
      "users.manage",
      "events.manage",
      "events.registrations.read",
      "bonuses.manage",
      "activity.company.read",
      "activity.settings.manage",
    ],
    members: ["hr"],
  },
  {
    key: "crm-coordinator",
    name: "CRM-координатор",
    description: "Подключения CRM и корпоративные уведомления",
    permissions: ["crm.manage", "notifications.manage"],
    members: ["hr", "sales-manager"],
  },
  {
    key: "content-manager",
    name: "Контент-менеджер",
    description: "Управление мероприятиями и каталогом бонусов",
    permissions: ["events.manage", "bonuses.manage"],
    members: ["olga-romanova"],
  },
];

const bonusDefinitions = [
  {
    key: "flex-start",
    title: "Гибкое начало дня на неделю",
    description: "Начинайте рабочий день в удобное время в течение недели.",
    category: "Комфорт",
    price: 450,
    emoji: "⏰",
    tint: "violet",
    stock: null,
  },
  {
    key: "team-lunch",
    title: "Обед с командой",
    description: "Сертификат на командный обед в офисе или рядом с ним.",
    category: "Впечатления",
    price: 650,
    emoji: "🍜",
    tint: "peach",
    stock: null,
  },
  {
    key: "merch",
    title: "Фирменный набор",
    description: "Худи, термокружка и блокнот SupchikCompany.",
    category: "Мерч",
    price: 800,
    emoji: "🎁",
    tint: "mint",
    stock: 18,
  },
  {
    key: "certificate",
    title: "Сертификат на 3 000 ₽",
    description: "Электронный сертификат популярного маркетплейса.",
    category: "Сертификаты",
    price: 1200,
    emoji: "✦",
    tint: "blue",
    stock: 9,
  },
  {
    key: "course",
    title: "Профессиональный онлайн-курс",
    description: "Компенсация курса по согласованному направлению развития.",
    category: "Развитие",
    price: 1500,
    emoji: "📚",
    tint: "blue",
    stock: null,
  },
  {
    key: "day-off",
    title: "Дополнительный выходной",
    description: "Один оплачиваемый выходной по согласованию с руководителем.",
    category: "Комфорт",
    price: 1800,
    emoji: "🏖️",
    tint: "violet",
    stock: 5,
  },
];

const eventDefinitions = [
  {
    key: "quarterly-meeting",
    title: "Квартальная встреча компании",
    description: "Итоги квартала, ключевые результаты и приоритеты команд.",
    kind: "Компания",
    location: "Большой зал, офис SupchikCompany",
    startsAt: daysFromNow(-20, 12),
    durationHours: 2,
    capacity: 80,
    registered: [
      "hr",
      "sales-manager",
      "support-manager",
      "development-manager",
      "anna-smirnova",
      "ivan-petrov",
      "ekaterina-orlova",
      "maxim-volkov",
      "olga-romanova",
      "roman-fedorov",
    ],
  },
  {
    key: "feedback-workshop",
    title: "Воркшоп: развивающая обратная связь",
    description: "Практика сложных разговоров и договорённостей внутри команды.",
    kind: "Развитие",
    location: "Переговорная «Север»",
    startsAt: daysFromNow(-8, 14),
    durationHours: 3,
    capacity: 24,
    registered: [
      "sales-manager",
      "support-manager",
      "anna-smirnova",
      "ivan-petrov",
      "ekaterina-orlova",
      "maxim-volkov",
    ],
  },
  {
    key: "energy-lecture",
    title: "Онлайн-лекция: управление энергией",
    description: "Практические инструменты для концентрации и восстановления.",
    kind: "Wellbeing",
    location: "Онлайн · корпоративный канал",
    startsAt: daysFromNow(3, 15),
    durationHours: 1.5,
    capacity: 120,
    registered: [
      "hr",
      "anna-smirnova",
      "ekaterina-orlova",
      "olga-romanova",
      "roman-fedorov",
      "nikita-kozlov",
    ],
  },
  {
    key: "ai-meetup",
    title: "Product Meetup: ИИ в работе команды",
    description: "Кейсы использования ИИ без потери качества и контроля.",
    kind: "Экспертиза",
    location: "Онлайн · трансляция из офиса",
    startsAt: daysFromNow(7, 16),
    durationHours: 2,
    capacity: 100,
    registered: [
      "development-manager",
      "olga-romanova",
      "roman-fedorov",
      "nikita-kozlov",
    ],
  },
  {
    key: "negotiation-training",
    title: "Тренинг по переговорам с клиентами",
    description: "Отработка возражений, аргументации и фиксации следующего шага.",
    kind: "Обучение",
    location: "Учебный класс, 4 этаж",
    startsAt: daysFromNow(14, 9),
    durationHours: 6,
    capacity: 18,
    registered: [
      "sales-manager",
      "support-manager",
      "anna-smirnova",
      "ivan-petrov",
      "ekaterina-orlova",
    ],
  },
  {
    key: "team-day",
    title: "Командный день SupchikCompany",
    description: "Совместная стратегическая сессия и неформальная программа.",
    kind: "Команда",
    location: "Загородный клуб «Лесная гавань»",
    startsAt: daysFromNow(30, 8),
    durationHours: 9,
    capacity: 60,
    registered: [
      "hr",
      "sales-manager",
      "support-manager",
      "development-manager",
      "anna-smirnova",
      "ivan-petrov",
      "ekaterina-orlova",
      "maxim-volkov",
      "olga-romanova",
      "roman-fedorov",
      "nikita-kozlov",
    ],
  },
];

const generatedMemberKeys = generatedMembers.map((member) => member.key);
eventDefinitions[0].registered.push(...generatedMemberKeys.slice(0, 36));
eventDefinitions[1].registered.push(...generatedMemberKeys.slice(4, 18));
eventDefinitions[2].registered.push(...generatedMemberKeys.slice(10, 42));
eventDefinitions[3].registered.push(...generatedMemberKeys.slice(16, 46));
eventDefinitions[4].registered.push(...generatedMemberKeys.slice(0, 12));
eventDefinitions[5].registered.push(...generatedMemberKeys.slice(0, 44));

const companyId = stableId("company", "main");
const integrationId = stableId("integration", "test-crm");
const adminMember = memberDefinitions.find((member) => member.key === "admin");
const adminMembershipId = stableId("membership", adminMember.key);
const adminUserId = stableId("user", adminMember.key);
const passwordHash = await hashPassword(seedConfig.password);
const aiApiKey = process.env.SEED_AI_API_KEY?.trim() || "";
const encryptedAiApiKey = encryptAiKey(aiApiKey);

const departmentByKey = new Map(
  departmentDefinitions.map((department) => [
    department.key,
    {
      ...department,
      id: stableId("department", department.key),
    },
  ]),
);

const memberByKey = new Map(
  memberDefinitions.map((member) => [
    member.key,
    {
      ...member,
      userId: stableId("user", member.key),
      accountId: stableId("account", member.key),
      membershipId: stableId("membership", member.key),
      profileId: stableId("profile", member.key),
      externalUserId: `supchik-${member.key}`,
    },
  ]),
);

memberByKey.get("anna-smirnova").externalUserId = "test-crm-user-1";
memberByKey.get("ivan-petrov").externalUserId = "test-crm-user-2";

async function deleteExistingCompany() {
  const existing = await sql`
    select id
    from company
    where slug = ${seedConfig.companySlug}
    limit 1
  `;

  if (!existing[0]) {
    return false;
  }

  if (!seedConfig.reset) {
    console.log(
      `Company "${seedConfig.companySlug}" already exists. ` +
        "Nothing was changed.",
    );
    console.log(
      "Set SEED_RESET=true to recreate only this company.",
    );
    return true;
  }

  await sql.begin(async (tx) => {
    const users = await tx`
      select user_id
      from company_membership
      where company_id = ${existing[0].id}
    `;

    await tx`
      delete from bonus_redemption
      where company_id = ${existing[0].id}
    `;

    await tx`
      delete from company
      where id = ${existing[0].id}
    `;

    for (const user of users) {
      await tx`
        delete from "user"
        where id = ${user.user_id}
          and not exists (
            select 1
            from company_membership
            where user_id = ${user.user_id}
          )
      `;
    }
  });

  return false;
}

async function seedDatabase() {
  const emailConflicts = await sql`
    select email
    from "user"
    where email = any(${memberDefinitions.map((member) => member.email)})
  `;

  if (emailConflicts.length > 0) {
    throw new Error(
      `Company seed email already exists: ${emailConflicts
        .map((row) => row.email)
        .join(", ")}`,
    );
  }

  const profileTotals = new Map(
    memberDefinitions.map((member) => [member.key, 0]),
  );
  const walletDeductions = new Map(
    memberDefinitions.map((member) => [member.key, 0]),
  );
  const testCrmTasks = [];
  let completedTaskCounter = 0;
  let openTaskCounter = 0;

  await sql.begin(async (tx) => {
    await tx`
      insert into company (
        id,
        name,
        slug,
        accent_color,
        created_at,
        updated_at
      ) values (
        ${companyId},
        ${seedConfig.companyName},
        ${seedConfig.companySlug},
        '#2676FF',
        ${daysFromNow(-120)},
        ${now}
      )
    `;

    for (const department of departmentByKey.values()) {
      await tx`
        insert into department (
          id,
          company_id,
          name,
          created_at,
          updated_at
        ) values (
          ${department.id},
          ${companyId},
          ${department.name},
          ${daysFromNow(-110)},
          ${now}
        )
      `;
    }

    for (const member of memberByKey.values()) {
      const department = departmentByKey.get(member.department);

      await tx`
        insert into "user" (
          id,
          name,
          email,
          email_verified,
          role,
          banned,
          created_at,
          updated_at
        ) values (
          ${member.userId},
          ${member.name},
          ${member.email},
          true,
          'user',
          false,
          ${daysFromNow(member.key === "nikita-kozlov" ? -6 : -100)},
          ${now}
        )
      `;

      await tx`
        insert into account (
          id,
          user_id,
          account_id,
          provider_id,
          password,
          created_at,
          updated_at
        ) values (
          ${member.accountId},
          ${member.userId},
          ${member.userId},
          'credential',
          ${passwordHash},
          ${daysFromNow(member.key === "nikita-kozlov" ? -6 : -100)},
          ${now}
        )
      `;

      await tx`
        insert into company_membership (
          id,
          company_id,
          user_id,
          role,
          status,
          created_at,
          updated_at
        ) values (
          ${member.membershipId},
          ${companyId},
          ${member.userId},
          ${member.role},
          'active',
          ${daysFromNow(member.key === "nikita-kozlov" ? -6 : -100)},
          ${now}
        )
      `;

      await tx`
        insert into employee_profile (
          id,
          membership_id,
          department_id,
          job_title,
          activity_points,
          wallet_points,
          created_at,
          updated_at
        ) values (
          ${member.profileId},
          ${member.membershipId},
          ${department.id},
          ${member.jobTitle},
          0,
          0,
          ${daysFromNow(member.key === "nikita-kozlov" ? -6 : -100)},
          ${now}
        )
      `;
    }

    for (const role of accessRoleDefinitions) {
      const roleId = stableId("access-role", role.key);

      await tx`
        insert into access_role (
          id,
          company_id,
          name,
          description,
          permissions,
          created_by_membership_id,
          created_at,
          updated_at
        ) values (
          ${roleId},
          ${companyId},
          ${role.name},
          ${role.description},
          ${JSON.stringify(role.permissions)}::jsonb,
          ${adminMembershipId},
          ${daysFromNow(-90)},
          ${now}
        )
      `;

      for (const memberKey of role.members) {
        const member = memberByKey.get(memberKey);

        await tx`
          insert into access_role_assignment (
            id,
            role_id,
            membership_id,
            created_at
          ) values (
            ${stableId("role-assignment", `${role.key}:${memberKey}`)},
            ${roleId},
            ${member.membershipId},
            ${daysFromNow(-85)}
          )
        `;
      }
    }

    await tx`
      insert into activity_settings (
        id,
        company_id,
        green_minimum,
        yellow_minimum,
        updated_by_membership_id,
        created_at,
        updated_at
      ) values (
        ${stableId("activity-settings", "main")},
        ${companyId},
        500,
        200,
        ${adminMembershipId},
        ${daysFromNow(-90)},
        ${now}
      )
    `;

    await tx`
      insert into notification_settings (
        id,
        company_id,
        email_enabled,
        from_name,
        reply_to,
        task_assigned,
        task_due_soon,
        task_completed,
        event_registration,
        weekly_digest,
        digest_day,
        event_recipients,
        updated_by_membership_id,
        created_at,
        updated_at
      ) values (
        ${stableId("notification-settings", "main")},
        ${companyId},
        true,
        'SupchikCompany',
        'hr@supchik.com',
        true,
        true,
        true,
        true,
        true,
        1,
        ${JSON.stringify([
          "hr@supchik.com",
          "admin@supchik.com",
        ])}::jsonb,
        ${adminMembershipId},
        ${daysFromNow(-90)},
        ${now}
      )
    `;

    const aiSystemPrompt = [
      "Ты корпоративный помощник SupchikCompany.",
      "Используй должность и профиль сотрудника, завершённые CRM-задачи,",
      "динамику активности и историю начислений.",
      "Отделяй факты от предположений, называй период анализа и источники данных.",
      "Не принимай кадровые решения и не ставь медицинские или психологические диагнозы.",
      "Предлагай руководителю проверяемые вопросы и конкретные следующие действия.",
    ].join(" ");

    await tx`
      insert into ai_settings (
        id,
        company_id,
        enabled,
        provider,
        model,
        base_url,
        system_prompt,
        api_key_encrypted,
        api_key_last4,
        updated_by_membership_id,
        created_at,
        updated_at
      ) values (
        ${stableId("ai-settings", "main")},
        ${companyId},
        true,
        'openai',
        'gpt-5-mini',
        null,
        ${aiSystemPrompt},
        ${encryptedAiApiKey},
        ${aiApiKey ? aiApiKey.slice(-4) : null},
        ${adminMembershipId},
        ${daysFromNow(-90)},
        ${now}
      )
    `;

    await tx`
      insert into crm_integration (
        id,
        company_id,
        provider,
        name,
        base_url,
        status,
        sync_secret_hash,
        default_points,
        config,
        last_sync_at,
        created_at,
        updated_at
      ) values (
        ${integrationId},
        ${companyId},
        'test-crm',
        'Supchik CRM',
        'http://localhost:4100',
        'active',
        ${hashSyncSecret(`pull-only:${integrationId}`)},
        140,
        ${JSON.stringify({
          pointsByPriority: {
            low: 80,
            medium: 140,
            high: 250,
          },
          statusMap: {
            OPEN: "new",
            IN_PROGRESS: "progress",
            COMPLETED: "done",
            CANCELLED: "cancelled",
          },
        })}::jsonb,
        ${now},
        ${daysFromNow(-90)},
        ${now}
      )
    `;

    for (const member of memberByKey.values()) {
      if (member.role === "admin") {
        continue;
      }

      await tx`
        insert into crm_user_mapping (
          id,
          integration_id,
          membership_id,
          external_user_id,
          external_email,
          created_at,
          updated_at
        ) values (
          ${stableId("crm-mapping", member.key)},
          ${integrationId},
          ${member.membershipId},
          ${member.externalUserId},
          ${member.email},
          ${daysFromNow(-85)},
          ${now}
        )
      `;
    }

    for (const [memberIndex, member] of [
      ...memberByKey.values(),
    ].entries()) {
      const plan = activityPlans[member.key];
      const department = departmentByKey.get(member.department);
      const titles = taskTitles[member.department];
      const periods = [
        {
          name: "completed-week",
          points: plan.current,
          startsAt: completedWeekStart,
        },
        {
          name: "previous-week",
          points: plan.previous,
          startsAt: previousWeekStart,
        },
      ];

      for (const period of periods) {
        for (const [index, points] of period.points.entries()) {
          completedTaskCounter += 1;
          const externalId = `SUP-DONE-${String(completedTaskCounter).padStart(
            4,
            "0",
          )}`;
          const taskId = stableId("task", externalId);
          const completedAt = addDays(
            period.startsAt,
            1 + (index % 5),
            10 + ((index + memberIndex) % 7),
          );
          const createdAt = addDays(completedAt, -2 - (index % 3), 9);
          const progressAt = addHours(createdAt, 24);
          const title = titles[(completedTaskCounter + memberIndex) % titles.length];
          const priority =
            points >= 220 ? "high" : points >= 140 ? "medium" : "low";

          await tx`
            insert into task (
              id,
              company_id,
              integration_id,
              external_id,
              assigned_membership_id,
              external_assignee_id,
              title,
              description,
              project,
              source_url,
              source_status,
              status,
              priority,
              points,
              due_at,
              completed_at,
              points_awarded_at,
              last_synced_at,
              source_payload,
              created_at,
              updated_at
            ) values (
              ${taskId},
              ${companyId},
              ${integrationId},
              ${externalId},
              ${member.membershipId},
              ${member.externalUserId},
              ${title},
              'Задача завершена в CRM и подтверждена синхронизацией.',
              ${department.name},
              ${`http://localhost:4100/#${externalId}`},
              'COMPLETED',
              'done',
              ${priority},
              ${points},
              ${addHours(completedAt, 8)},
              ${completedAt},
              ${completedAt},
              ${completedAt},
              ${JSON.stringify({
                seeded: true,
                period: period.name,
              })}::jsonb,
              ${createdAt},
              ${completedAt}
            )
          `;

          await tx`
            insert into task_status_history (
              id,
              task_id,
              from_status,
              to_status,
              source_status,
              observed_at
            ) values
              (
                ${stableId("task-history", `${externalId}:new`)},
                ${taskId},
                null,
                'new',
                'OPEN',
                ${createdAt}
              ),
              (
                ${stableId("task-history", `${externalId}:progress`)},
                ${taskId},
                'new',
                'progress',
                'IN_PROGRESS',
                ${progressAt}
              ),
              (
                ${stableId("task-history", `${externalId}:done`)},
                ${taskId},
                'progress',
                'done',
                'COMPLETED',
                ${completedAt}
              )
          `;

          await tx`
            insert into point_ledger (
              id,
              company_id,
              membership_id,
              task_id,
              amount,
              kind,
              idempotency_key,
              is_reversal,
              metadata,
              created_at
            ) values (
              ${stableId("point-ledger", externalId)},
              ${companyId},
              ${member.membershipId},
              ${taskId},
              ${points},
              'task_completed',
              ${`task-completed:${taskId}`},
              false,
              ${JSON.stringify({
                externalTaskId: externalId,
                seeded: true,
              })}::jsonb,
              ${completedAt}
            )
          `;

          profileTotals.set(
            member.key,
            profileTotals.get(member.key) + points,
          );
        }
      }

      if (member.role === "admin") {
        continue;
      }

      const openTitles = openTaskTemplates[member.department];
      const openStatuses = ["progress", "new"];

      for (const [index, title] of openTitles.entries()) {
        openTaskCounter += 1;
        const externalId = `SUP-OPEN-${String(openTaskCounter).padStart(
          3,
          "0",
        )}`;
        const taskId = stableId("task", externalId);
        const createdAt = daysFromNow(-6 + index, 9);
        const dueAt = daysFromNow(3 + index * 4 + (memberIndex % 3), 15);
        const status = openStatuses[index % openStatuses.length];
        const priority = index === 0 ? "high" : "medium";
        const points = priority === "high" ? 250 : 140;

        await tx`
          insert into task (
            id,
            company_id,
            integration_id,
            external_id,
            assigned_membership_id,
            external_assignee_id,
            title,
            description,
            project,
            source_url,
            source_status,
            status,
            priority,
            points,
            due_at,
            completed_at,
            points_awarded_at,
            last_synced_at,
            source_payload,
            created_at,
            updated_at
          ) values (
            ${taskId},
            ${companyId},
            ${integrationId},
            ${externalId},
            ${member.membershipId},
            ${member.externalUserId},
            ${title},
            'Текущая рабочая задача из тестовой CRM.',
            ${department.name},
            ${`http://localhost:4100/#${externalId}`},
            ${status === "progress" ? "IN_PROGRESS" : "OPEN"},
            ${status},
            ${priority},
            ${points},
            ${dueAt},
            null,
            null,
            ${now},
            ${JSON.stringify({ seeded: true, live: true })}::jsonb,
            ${createdAt},
            ${now}
          )
        `;

        await tx`
          insert into task_status_history (
            id,
            task_id,
            from_status,
            to_status,
            source_status,
            observed_at
          ) values (
            ${stableId("task-history", `${externalId}:${status}`)},
            ${taskId},
            null,
            ${status},
            ${status === "progress" ? "IN_PROGRESS" : "OPEN"},
            ${createdAt}
          )
        `;

        testCrmTasks.push({
          id: externalId,
          title,
          project: department.name,
          assigneeId: member.externalUserId,
          status,
          priority,
          points,
          dueAt: dueAt.toISOString(),
        });
      }
    }

    for (const bonus of bonusDefinitions) {
      await tx`
        insert into bonus_item (
          id,
          company_id,
          title,
          description,
          category,
          price,
          emoji,
          tint,
          stock,
          status,
          created_by_membership_id,
          created_at,
          updated_at
        ) values (
          ${stableId("bonus", bonus.key)},
          ${companyId},
          ${bonus.title},
          ${bonus.description},
          ${bonus.category},
          ${bonus.price},
          ${bonus.emoji},
          ${bonus.tint},
          ${bonus.stock},
          'active',
          ${adminMembershipId},
          ${daysFromNow(-70)},
          ${now}
        )
      `;
    }

    const redemptions = [
      {
        key: "anna-lunch",
        member: "anna-smirnova",
        bonus: "team-lunch",
        price: 650,
        status: "fulfilled",
        createdAt: daysFromNow(-12),
      },
      {
        key: "roman-merch",
        member: "roman-fedorov",
        bonus: "merch",
        price: 800,
        status: "approved",
        createdAt: daysFromNow(-4),
      },
      {
        key: "olga-certificate",
        member: "olga-romanova",
        bonus: "certificate",
        price: 1200,
        status: "requested",
        createdAt: daysFromNow(-2),
      },
    ];

    for (const redemption of redemptions) {
      const member = memberByKey.get(redemption.member);

      await tx`
        insert into bonus_redemption (
          id,
          company_id,
          bonus_id,
          membership_id,
          price,
          status,
          created_at,
          updated_at
        ) values (
          ${stableId("redemption", redemption.key)},
          ${companyId},
          ${stableId("bonus", redemption.bonus)},
          ${member.membershipId},
          ${redemption.price},
          ${redemption.status},
          ${redemption.createdAt},
          ${redemption.createdAt}
        )
      `;

      walletDeductions.set(
        redemption.member,
        walletDeductions.get(redemption.member) + redemption.price,
      );
    }

    for (const event of eventDefinitions) {
      const eventId = stableId("event", event.key);

      await tx`
        insert into event (
          id,
          company_id,
          title,
          description,
          kind,
          location,
          starts_at,
          ends_at,
          capacity,
          status,
          created_by_membership_id,
          created_at,
          updated_at
        ) values (
          ${eventId},
          ${companyId},
          ${event.title},
          ${event.description},
          ${event.kind},
          ${event.location},
          ${event.startsAt},
          ${addHours(event.startsAt, event.durationHours)},
          ${event.capacity},
          'published',
          ${adminMembershipId},
          ${daysFromNow(-35)},
          ${now}
        )
      `;

      for (const memberKey of event.registered) {
        const member = memberByKey.get(memberKey);
        const registeredAt = new Date(
          Math.min(
            daysFromNow(-25).getTime(),
            event.startsAt.getTime() - 2 * 24 * 60 * 60 * 1000,
          ),
        );

        await tx`
          insert into event_registration (
            id,
            event_id,
            membership_id,
            status,
            registered_at,
            updated_at
          ) values (
            ${stableId("event-registration", `${event.key}:${memberKey}`)},
            ${eventId},
            ${member.membershipId},
            'registered',
            ${registeredAt},
            ${registeredAt}
          )
        `;
      }
    }

    for (const member of memberByKey.values()) {
      const activityPoints = profileTotals.get(member.key);
      const walletPoints = Math.max(
        0,
        activityPoints - walletDeductions.get(member.key),
      );

      await tx`
        update employee_profile
        set
          activity_points = ${activityPoints},
          wallet_points = ${walletPoints},
          updated_at = ${now}
        where membership_id = ${member.membershipId}
      `;
    }

    await tx`
      insert into audit_log (
        id,
        company_id,
        actor_user_id,
        action,
        target_type,
        target_id,
        metadata,
        created_at
      ) values (
        ${stableId("audit", "company-seeded")},
        ${companyId},
        ${adminUserId},
        'company.seeded',
        'company',
        ${companyId},
        ${JSON.stringify({
          departments: departmentDefinitions.length,
          employees: memberDefinitions.length,
          completedTasks: completedTaskCounter,
          openTasks: openTaskCounter,
          events: eventDefinitions.length,
          bonuses: bonusDefinitions.length,
        })}::jsonb,
        ${now}
      )
    `;
  });

  return { testCrmTasks, completedTaskCounter, openTaskCounter };
}

async function configureTestCrm(testCrmTasks) {
  const users = [...memberByKey.values()]
    .filter((member) => member.role !== "admin")
    .map((member) => ({
      id: member.externalUserId,
      name: member.name,
      email: member.email,
    }));

  await writeFile(
    resolve(projectRoot, "test-crm", "data.json"),
    `${JSON.stringify({ users, tasks: testCrmTasks }, null, 2)}\n`,
    "utf8",
  );
}

try {
  const skipped = await deleteExistingCompany();

  if (!skipped) {
    const result = await seedDatabase();
    await configureTestCrm(result.testCrmTasks);

    console.log("");
    console.log(`Company created: ${seedConfig.companyName}`);
    console.log(`Company slug: ${seedConfig.companySlug}`);
    console.log(`Employees: ${memberDefinitions.length}`);
    console.log(`Completed CRM tasks: ${result.completedTaskCounter}`);
    console.log(`Active CRM tasks: ${result.openTaskCounter}`);
    console.log(`Events: ${eventDefinitions.length}`);
    console.log(`Bonuses: ${bonusDefinitions.length}`);
    console.log("");
    console.log("Login credentials:");
    console.log(`  Admin: admin@supchik.com / ${seedConfig.password}`);
    console.log(`  HR: hr@supchik.com / ${seedConfig.password}`);
    console.log(
      `  Manager: d.sokolov@supchik.com / ${seedConfig.password}`,
    );
    console.log(
      `  Employee: anna@supchik.com / ${seedConfig.password}`,
    );
    console.log("Test CRM data has been written automatically.");

    if (!aiApiKey) {
      console.log("");
      console.log(
        "AI settings were created without an API key. " +
          "Set SEED_AI_API_KEY and SEED_RESET=true to add one.",
      );
    }
  }
} finally {
  await sql.end();
}
