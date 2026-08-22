import { and, asc, count, eq, ilike, or, sql } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { writeAuditLog } from "@/backend/audit/log";
import { getDb } from "@/db";
import {
  accounts,
  auditLogs,
  companyMemberships,
  departments,
  employeeProfiles,
  users,
  type CompanyRole,
} from "@/db/schema";

export async function assertDepartmentInCompany(
  companyId: string,
  departmentId?: string | null,
) {
  if (!departmentId) return;
  const row = await getDb()
    .select({ id: departments.id })
    .from(departments)
    .where(
      and(
        eq(departments.id, departmentId),
        eq(departments.companyId, companyId),
      ),
    )
    .limit(1);
  if (!row[0]) {
    throw Response.json(
      {
        error: {
          code: "DEPARTMENT_NOT_FOUND",
          message: "Отдел не найден в рабочем пространстве",
        },
      },
      { status: 404 },
    );
  }
}

export async function listCompanyEmployees(
  companyId: string,
  options: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: "active" | "suspended";
  } = {},
) {
  const db = getDb();
  const pageSize = Math.min(Math.max(options.pageSize ?? 25, 1), 100);
  const search = options.search?.trim().slice(0, 100) ?? "";
  const filter = and(
    eq(companyMemberships.companyId, companyId),
    options.status
      ? eq(companyMemberships.status, options.status)
      : sql<boolean>`true`,
    search
      ? or(
          ilike(users.name, `%${search}%`),
          ilike(users.email, `%${search}%`),
          ilike(employeeProfiles.jobTitle, `%${search}%`),
        )
      : sql<boolean>`true`,
  );
  const [totalRow] = await db
    .select({ total: count() })
    .from(companyMemberships)
    .innerJoin(users, eq(companyMemberships.userId, users.id))
    .leftJoin(
      employeeProfiles,
      eq(employeeProfiles.membershipId, companyMemberships.id),
    )
    .where(filter);
  const total = Number(totalRow?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(options.page ?? 1, 1), totalPages);
  const employees = await db
    .select({
      membershipId: companyMemberships.id,
      userId: users.id,
      name: users.name,
      email: users.email,
      role: companyMemberships.role,
      status: companyMemberships.status,
      jobTitle: employeeProfiles.jobTitle,
      departmentId: departments.id,
      departmentName: departments.name,
      activityPoints: employeeProfiles.activityPoints,
      walletPoints: employeeProfiles.walletPoints,
    })
    .from(companyMemberships)
    .innerJoin(users, eq(companyMemberships.userId, users.id))
    .leftJoin(
      employeeProfiles,
      eq(employeeProfiles.membershipId, companyMemberships.id),
    )
    .leftJoin(departments, eq(employeeProfiles.departmentId, departments.id))
    .where(filter)
    .orderBy(asc(users.name))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  return {
    employees,
    pagination: { page, pageSize, total, totalPages },
  };
}

export async function createCompanyEmployee(
  companyId: string,
  actorUserId: string,
  actorRole: CompanyRole,
  input: {
    name: string;
    email: string;
    password: string;
    role: CompanyRole;
    departmentId?: string | null;
    jobTitle?: string | null;
  },
) {
  if (input.role === "admin" && actorRole !== "admin") {
    throw Response.json(
      {
        error: {
          code: "ADMIN_CREATION_FORBIDDEN",
          message:
            "Только системный администратор может создать другого администратора",
        },
      },
      { status: 403 },
    );
  }
  await assertDepartmentInCompany(companyId, input.departmentId);
  const db = getDb();
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);
  if (existing[0]) {
    throw Response.json(
      {
        error: {
          code: "USER_ALREADY_EXISTS",
          message: "Аккаунт с этой рабочей почтой уже существует",
        },
      },
      { status: 409 },
    );
  }

  const userId = crypto.randomUUID();
  const accountId = crypto.randomUUID();
  const membershipId = crypto.randomUUID();
  const profileId = crypto.randomUUID();
  const passwordHash = await hashPassword(input.password);
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx.insert(users).values({
      id: userId,
      name: input.name,
      email: input.email,
      emailVerified: true,
      role: "user",
      createdAt: now,
      updatedAt: now,
    });
    await tx.insert(accounts).values({
      id: accountId,
      userId,
      accountId: userId,
      providerId: "credential",
      password: passwordHash,
      createdAt: now,
      updatedAt: now,
    });
    await tx.insert(companyMemberships).values({
      id: membershipId,
      companyId,
      userId,
      role: input.role,
    });
    await tx.insert(employeeProfiles).values({
      id: profileId,
      membershipId,
      departmentId: input.departmentId ?? null,
      jobTitle: input.jobTitle ?? null,
    });
    await tx.insert(auditLogs).values({
      id: crypto.randomUUID(),
      companyId,
      actorUserId,
      action: "employee.created",
      targetType: "membership",
      targetId: membershipId,
      metadata: { role: input.role, email: input.email },
    });
  });
  return { userId, membershipId, profileId };
}

export async function updateCompanyMembership(
  companyId: string,
  actorUserId: string,
  actorRole: CompanyRole,
  membershipId: string,
  input: {
    role?: CompanyRole;
    status?: "active" | "suspended";
    departmentId?: string | null;
    jobTitle?: string | null;
  },
) {
  await assertDepartmentInCompany(companyId, input.departmentId);
  const db = getDb();
  const rows = await db
    .select({ membership: companyMemberships, profile: employeeProfiles })
    .from(companyMemberships)
    .leftJoin(
      employeeProfiles,
      eq(employeeProfiles.membershipId, companyMemberships.id),
    )
    .where(
      and(
        eq(companyMemberships.id, membershipId),
        eq(companyMemberships.companyId, companyId),
      ),
    )
    .limit(1);
  const existing = rows[0];
  if (!existing) {
    throw Response.json(
      {
        error: {
          code: "MEMBERSHIP_NOT_FOUND",
          message: "Сотрудник не найден в рабочем пространстве",
        },
      },
      { status: 404 },
    );
  }
  if (
    existing.membership.userId === actorUserId &&
    input.status === "suspended"
  ) {
    throw Response.json(
      {
        error: {
          code: "CANNOT_SUSPEND_SELF",
          message: "Нельзя заблокировать собственный аккаунт",
        },
      },
      { status: 409 },
    );
  }
  if (input.role && actorRole !== "admin") {
    throw Response.json(
      {
        error: {
          code: "ROLE_CHANGE_FORBIDDEN",
          message: "Только администратор может изменять роли",
        },
      },
      { status: 403 },
    );
  }
  if (existing.membership.role === "admin" && actorRole !== "admin") {
    throw Response.json(
      {
        error: {
          code: "ADMIN_ACCOUNT_PROTECTED",
          message: "Недостаточно прав для изменения администратора",
        },
      },
      { status: 403 },
    );
  }
  const removesActiveAdmin =
    existing.membership.role === "admin" &&
    existing.membership.status === "active" &&
    (input.status === "suspended" ||
      (input.role !== undefined && input.role !== "admin"));
  if (removesActiveAdmin) {
    const result = await db
      .select({ value: count() })
      .from(companyMemberships)
      .where(
        and(
          eq(companyMemberships.companyId, companyId),
          eq(companyMemberships.role, "admin"),
          eq(companyMemberships.status, "active"),
        ),
      );
    if ((result[0]?.value ?? 0) <= 1) {
      throw Response.json(
        {
          error: {
            code: "LAST_ADMIN_PROTECTED",
            message:
              "В компании должен остаться хотя бы один активный администратор",
          },
        },
        { status: 409 },
      );
    }
  }
  if (input.role || input.status) {
    await db
      .update(companyMemberships)
      .set({
        ...(input.role ? { role: input.role } : {}),
        ...(input.status ? { status: input.status } : {}),
        updatedAt: new Date(),
      })
      .where(eq(companyMemberships.id, membershipId));
  }
  if (input.departmentId !== undefined || input.jobTitle !== undefined) {
    await db
      .update(employeeProfiles)
      .set({
        ...(input.departmentId !== undefined
          ? { departmentId: input.departmentId }
          : {}),
        ...(input.jobTitle !== undefined ? { jobTitle: input.jobTitle } : {}),
        updatedAt: new Date(),
      })
      .where(eq(employeeProfiles.membershipId, membershipId));
  }
  await writeAuditLog(db, {
    companyId,
    actorUserId,
    action: "employee.updated",
    targetType: "membership",
    targetId: membershipId,
    metadata: { ...input },
  });
}

export async function deleteCompanyEmployee(
  companyId: string,
  actorUserId: string,
  actorRole: CompanyRole,
  membershipId: string,
) {
  const db = getDb();
  const [target] = await db
    .select({
      userId: companyMemberships.userId,
      role: companyMemberships.role,
      status: companyMemberships.status,
      email: users.email,
    })
    .from(companyMemberships)
    .innerJoin(users, eq(companyMemberships.userId, users.id))
    .where(
      and(
        eq(companyMemberships.id, membershipId),
        eq(companyMemberships.companyId, companyId),
      ),
    )
    .limit(1);
  if (!target)
    throw Response.json(
      { error: { code: "MEMBERSHIP_NOT_FOUND", message: "Сотрудник не найден" } },
      { status: 404 },
    );
  if (target.userId === actorUserId)
    throw Response.json(
      {
        error: {
          code: "CANNOT_DELETE_SELF",
          message: "Нельзя удалить собственный аккаунт",
        },
      },
      { status: 409 },
    );
  if (target.role === "admin" && actorRole !== "admin")
    throw Response.json(
      {
        error: {
          code: "ADMIN_ACCOUNT_PROTECTED",
          message: "Недостаточно прав для удаления администратора",
        },
      },
      { status: 403 },
    );
  if (target.role === "admin" && target.status === "active") {
    const [admins] = await db
      .select({ value: count() })
      .from(companyMemberships)
      .where(
        and(
          eq(companyMemberships.companyId, companyId),
          eq(companyMemberships.role, "admin"),
          eq(companyMemberships.status, "active"),
        ),
      );
    if ((admins?.value ?? 0) <= 1)
      throw Response.json(
        {
          error: {
            code: "LAST_ADMIN_PROTECTED",
            message: "Нельзя удалить последнего активного администратора",
          },
        },
        { status: 409 },
      );
  }

  await db.transaction(async (tx) => {
    await tx.insert(auditLogs).values({
      id: crypto.randomUUID(),
      companyId,
      actorUserId,
      action: "employee.deleted",
      targetType: "membership",
      targetId: membershipId,
      metadata: { email: target.email, role: target.role },
    });
    await tx
      .delete(companyMemberships)
      .where(
        and(
          eq(companyMemberships.id, membershipId),
          eq(companyMemberships.companyId, companyId),
        ),
      );
    const [memberships] = await tx
      .select({ value: count() })
      .from(companyMemberships)
      .where(eq(companyMemberships.userId, target.userId));
    if ((memberships?.value ?? 0) === 0)
      await tx.delete(users).where(eq(users.id, target.userId));
  });
}
