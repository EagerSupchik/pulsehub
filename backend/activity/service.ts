import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { activitySettings } from "@/db/schema";

type ActivityRow = {
  membershipId: string;
  departmentId: string;
  departmentName: string;
  name: string;
  jobTitle: string | null;
  currentPoints: number | string;
  previousPoints: number | string;
  taskCount: number | string;
  lifetimeTaskCount: number | string;
  lastActiveAt: Date | string | null;
};

type ActivityFilters = {
  departmentId?: string | null;
  level?: "green" | "yellow" | "red" | "unrated";
  search?: string;
  page?: number;
  pageSize?: number;
  exportAll?: boolean;
};

function insight(
  score: number,
  delta: number,
  tasks: number,
  lifetimeTasks: number,
) {
  if (lifetimeTasks === 0)
    return "Оценка появится после первой завершённой задачи и окончания недели.";
  if (tasks === 0)
    return "За завершённую неделю нет выполненных задач. Стоит проверить нагрузку и возможные блокеры.";
  if (delta <= -25)
    return "Результат снизился относительно предыдущей недели.";
  if (delta >= 25)
    return "Результат вырос относительно предыдущей недели.";
  if (score > 0)
    return "Активность стабильна по итогам завершённой недели.";
  return "Данных пока недостаточно для устойчивого вывода.";
}

export async function getActivityTracking(
  companyId: string,
  departmentScopeId?: string | null,
  filters: ActivityFilters = {},
) {
  const db = getDb();
  const [settings] = await db
    .select()
    .from(activitySettings)
    .where(eq(activitySettings.companyId, companyId))
    .limit(1);
  const thresholds = settings ?? { greenMinimum: 400, yellowMinimum: 150 };
  const departmentScope = departmentScopeId
    ? sql`and d.id = ${departmentScopeId}`
    : sql``;
  const result = await db.execute<ActivityRow>(sql`
    with bounds as (
      select
        date_trunc('week', now()) - interval '7 days' as current_start,
        date_trunc('week', now()) as current_end,
        date_trunc('week', now()) - interval '14 days' as previous_start
    ), point_totals as (
      select membership_id,
        coalesce(sum(amount) filter (where created_at >= b.current_start and created_at < b.current_end and is_reversal = false), 0) as current_points,
        coalesce(sum(amount) filter (where created_at >= b.previous_start and created_at < b.current_start and is_reversal = false), 0) as previous_points
      from point_ledger cross join bounds b
      where company_id = ${companyId} and created_at >= b.previous_start and created_at < b.current_end
      group by membership_id
    ), task_totals as (
      select assigned_membership_id,
        count(*) filter (where status = 'done' and completed_at >= b.current_start and completed_at < b.current_end) as task_count,
        count(*) filter (
          where status = 'done' and completed_at < b.current_end
        ) as lifetime_task_count,
        max(updated_at) as last_active_at
      from task cross join bounds b
      where company_id = ${companyId}
      group by assigned_membership_id
    )
    select
      cm.id as "membershipId",
      d.id as "departmentId",
      d.name as "departmentName",
      u.name as "name",
      ep.job_title as "jobTitle",
      coalesce(pt.current_points, 0) as "currentPoints",
      coalesce(pt.previous_points, 0) as "previousPoints",
      coalesce(tt.task_count, 0) as "taskCount",
      coalesce(tt.lifetime_task_count, 0) as "lifetimeTaskCount",
      tt.last_active_at as "lastActiveAt"
    from company_membership cm
    join "user" u on u.id = cm.user_id
    join employee_profile ep on ep.membership_id = cm.id
    join department d on d.id = ep.department_id
    left join point_totals pt on pt.membership_id = cm.id
    left join task_totals tt on tt.assigned_membership_id = cm.id
    where cm.company_id = ${companyId} and cm.status = 'active' ${departmentScope}
    order by d.name, u.name
  `);

  const employees = Array.from(result).map((row) => {
    const score = Number(row.currentPoints);
    const previous = Number(row.previousPoints);
    const lifetimeTasks = Number(row.lifetimeTaskCount);
    const delta =
      previous > 0
        ? Math.round(((score - previous) / previous) * 100)
        : score > 0
          ? 100
          : 0;
    const level: "green" | "yellow" | "red" | "unrated" =
      lifetimeTasks === 0
        ? "unrated"
        : score >= thresholds.greenMinimum
          ? "green"
          : score >= thresholds.yellowMinimum
            ? "yellow"
            : "red";
    return {
      id: row.membershipId,
      name: row.name,
      initials: row.name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase(),
      position: row.jobTitle ?? "Сотрудник",
      departmentId: row.departmentId,
      level,
      score,
      delta,
      tasks: Number(row.taskCount),
      lastActiveAt: row.lastActiveAt
        ? new Date(row.lastActiveAt).toISOString()
        : null,
      insight: insight(score, delta, Number(row.taskCount), lifetimeTasks),
    };
  });

  const departments = new Map<
    string,
    {
      id: string;
      name: string;
      employees: number;
      total: number;
      previous: number;
      rated: number;
      counts: Record<"green" | "yellow" | "red" | "unrated", number>;
    }
  >();
  for (const employee of employees) {
    const row = Array.from(result).find(
      (item) => item.membershipId === employee.id,
    )!;
    const department = departments.get(employee.departmentId) ?? {
      id: employee.departmentId,
      name: row.departmentName,
      employees: 0,
      total: 0,
      previous: 0,
      rated: 0,
      counts: { green: 0, yellow: 0, red: 0, unrated: 0 },
    };
    department.employees += 1;
    department.total += employee.score;
    department.previous += Number(row.previousPoints);
    department.counts[employee.level] += 1;
    if (employee.level !== "unrated") department.rated += 1;
    departments.set(employee.departmentId, department);
  }

  const departmentItems = [...departments.values()];
  const selectedDepartmentId =
    filters.departmentId ?? departmentItems[0]?.id ?? null;
  const selectedLevel = filters.level ?? "unrated";
  const normalizedSearch = filters.search
    ?.trim()
    .toLocaleLowerCase("ru-RU");
  const matchingEmployees = employees.filter(
    (employee) =>
      employee.departmentId === selectedDepartmentId &&
      employee.level === selectedLevel &&
      (!normalizedSearch ||
        employee.name.toLocaleLowerCase("ru-RU").includes(normalizedSearch) ||
        employee.position
          .toLocaleLowerCase("ru-RU")
          .includes(normalizedSearch)),
  );
  const pageSize = filters.exportAll
    ? Math.min(matchingEmployees.length || 1, 5_000)
    : Math.min(Math.max(filters.pageSize ?? 25, 1), 100);
  const totalPages = Math.max(1, Math.ceil(matchingEmployees.length / pageSize));
  const page = Math.min(Math.max(filters.page ?? 1, 1), totalPages);
  const pageEmployees = filters.exportAll
    ? matchingEmployees.slice(0, pageSize)
    : matchingEmployees.slice((page - 1) * pageSize, page * pageSize);

  return {
    periodDays: 7,
    periodStart: new Date(
      Date.now() - ((new Date().getUTCDay() + 6) % 7 + 7) * 86_400_000,
    )
      .toISOString()
      .slice(0, 10),
    periodEnd: new Date(
      Date.now() - ((new Date().getUTCDay() + 6) % 7) * 86_400_000,
    )
      .toISOString()
      .slice(0, 10),
    thresholds: {
      greenMinimum: thresholds.greenMinimum,
      yellowMinimum: thresholds.yellowMinimum,
    },
    departments: departmentItems.map(
      ({ total, previous, rated, ...department }) => ({
        ...department,
        average: rated ? Math.round(total / rated) : 0,
        trend:
          previous > 0
            ? Math.round(((total - previous) / previous) * 100)
            : total > 0
              ? 100
              : 0,
      }),
    ),
    employees: pageEmployees,
    pagination: {
      page,
      pageSize,
      total: matchingEmployees.length,
      totalPages,
    },
  };
}

export async function updateActivityThresholds(
  companyId: string,
  membershipId: string,
  input: { greenMinimum: number; yellowMinimum: number },
) {
  const now = new Date();
  const [saved] = await getDb()
    .insert(activitySettings)
    .values({
      id: crypto.randomUUID(),
      companyId,
      updatedByMembershipId: membershipId,
      ...input,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: activitySettings.companyId,
      set: { ...input, updatedByMembershipId: membershipId, updatedAt: now },
    })
    .returning();
  return {
    greenMinimum: saved.greenMinimum,
    yellowMinimum: saved.yellowMinimum,
  };
}
