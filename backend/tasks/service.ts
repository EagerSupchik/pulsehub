import { createHash, randomBytes } from "node:crypto";
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  isNull,
  or,
  sql,
} from "drizzle-orm";
import { getDb } from "@/db";
import {
  companyMemberships,
  crmIntegrations,
  crmUserMappings,
  employeeProfiles,
  pointLedger,
  tasks,
  taskStatusHistory,
  users,
} from "@/db/schema";
import { z } from "zod";
import { crmSyncSchema } from "./schemas";

type SyncInput = z.infer<typeof crmSyncSchema>;

const pullTaskSchema = z.object({
  id: z.string().trim().min(1).max(255),
  assigneeId: z.string().trim().min(1).max(255).nullable().optional(),
  title: z.string().trim().min(1).max(500),
  description: z.string().max(20_000).nullable().optional(),
  project: z.string().max(255).nullable().optional(),
  status: z.enum(["new", "progress", "done", "cancelled"]),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  points: z.number().int().min(0).max(100_000).optional(),
  dueAt: z.iso.datetime({ offset: true }).nullable().optional(),
  completedAt: z.iso.datetime({ offset: true }).nullable().optional(),
});

const pullResponseSchema = z.object({
  tasks: z.array(pullTaskSchema).max(1_000),
});

function hashSecret(secret: string) {
  return createHash("sha256").update(secret, "utf8").digest("hex");
}

export async function createCrmIntegration(
  companyId: string,
  input: {
    provider: string;
    name: string;
    baseUrl?: string | null;
    defaultPoints: number;
    config: Record<string, unknown>;
  },
) {
  const id = crypto.randomUUID();
  await getDb()
    .insert(crmIntegrations)
    .values({
      id,
      companyId,
      provider: input.provider.toLowerCase(),
      name: input.name,
      baseUrl: input.baseUrl ?? null,
      defaultPoints: input.defaultPoints,
      config: input.config,
      syncSecretHash: hashSecret(randomBytes(32).toString("base64url")),
    });
  return { id };
}

export async function listCrmIntegrations(companyId: string) {
  return getDb()
    .select({
      id: crmIntegrations.id,
      provider: crmIntegrations.provider,
      name: crmIntegrations.name,
      baseUrl: crmIntegrations.baseUrl,
      status: crmIntegrations.status,
      defaultPoints: crmIntegrations.defaultPoints,
      config: crmIntegrations.config,
      lastSyncAt: crmIntegrations.lastSyncAt,
      createdAt: crmIntegrations.createdAt,
    })
    .from(crmIntegrations)
    .where(
      and(
        eq(crmIntegrations.companyId, companyId),
        isNull(crmIntegrations.deletedAt),
      ),
    )
    .orderBy(desc(crmIntegrations.createdAt));
}

export async function updateCrmIntegration(
  companyId: string,
  integrationId: string,
  input: {
    name?: string;
    baseUrl?: string | null;
    defaultPoints?: number;
    status?: "active" | "paused";
    config?: Record<string, unknown>;
  },
) {
  const [integration] = await getDb()
    .update(crmIntegrations)
    .set({ ...input, updatedAt: new Date() })
    .where(
      and(
        eq(crmIntegrations.id, integrationId),
        eq(crmIntegrations.companyId, companyId),
        isNull(crmIntegrations.deletedAt),
      ),
    )
    .returning();
  if (!integration)
    throw Response.json(
      {
        error: {
          code: "INTEGRATION_NOT_FOUND",
          message: "CRM-интеграция не найдена",
        },
      },
      { status: 404 },
    );
  return integration;
}

export async function deleteCrmIntegration(
  companyId: string,
  integrationId: string,
) {
  const [integration] = await getDb()
    .update(crmIntegrations)
    .set({
      status: "paused",
      deletedAt: new Date(),
      name: `Удалено ${integrationId}`,
      syncSecretHash: hashSecret(randomBytes(32).toString("base64url")),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(crmIntegrations.id, integrationId),
        eq(crmIntegrations.companyId, companyId),
        isNull(crmIntegrations.deletedAt),
      ),
    )
    .returning({ id: crmIntegrations.id });
  if (!integration)
    throw Response.json(
      {
        error: {
          code: "INTEGRATION_NOT_FOUND",
          message: "CRM-интеграция не найдена",
        },
      },
      { status: 404 },
    );
}

export async function createCrmUserMapping(
  companyId: string,
  integrationId: string,
  input: {
    membershipId: string;
    externalUserId: string;
    externalEmail?: string | null;
  },
) {
  const [integration] = await getDb()
    .select({ id: crmIntegrations.id })
    .from(crmIntegrations)
    .where(
      and(
        eq(crmIntegrations.id, integrationId),
        eq(crmIntegrations.companyId, companyId),
        isNull(crmIntegrations.deletedAt),
      ),
    )
    .limit(1);
  const [membership] = await getDb()
    .select({ id: companyMemberships.id })
    .from(companyMemberships)
    .where(
      and(
        eq(companyMemberships.id, input.membershipId),
        eq(companyMemberships.companyId, companyId),
      ),
    )
    .limit(1);
  if (!integration || !membership) {
    throw Response.json(
      {
        error: {
          code: "MAPPING_TARGET_NOT_FOUND",
          message: "Интеграция или сотрудник не найдены в этой компании",
        },
      },
      { status: 404 },
    );
  }
  const id = crypto.randomUUID();
  await getDb()
    .insert(crmUserMappings)
    .values({ id, integrationId, ...input });
  return { id };
}

export async function listCrmUserMappings(
  companyId: string,
  integrationId: string,
  options: { page?: number; pageSize?: number; search?: string } = {},
) {
  const db = getDb();
  const [integration] = await db
    .select({ id: crmIntegrations.id })
    .from(crmIntegrations)
    .where(
      and(
        eq(crmIntegrations.id, integrationId),
        eq(crmIntegrations.companyId, companyId),
        isNull(crmIntegrations.deletedAt),
      ),
    )
    .limit(1);
  if (!integration)
    throw Response.json(
      {
        error: {
          code: "INTEGRATION_NOT_FOUND",
          message: "CRM-интеграция не найдена",
        },
      },
      { status: 404 },
    );
  const pageSize = Math.min(Math.max(options.pageSize ?? 25, 1), 100);
  const search = options.search?.trim().slice(0, 100) ?? "";
  const filter = and(
    eq(crmUserMappings.integrationId, integrationId),
    search
      ? or(
          ilike(users.name, `%${search}%`),
          ilike(users.email, `%${search}%`),
          ilike(crmUserMappings.externalUserId, `%${search}%`),
        )
      : sql<boolean>`true`,
  );
  const [totalRow] = await db
    .select({ total: count() })
    .from(crmUserMappings)
    .innerJoin(
      companyMemberships,
      eq(crmUserMappings.membershipId, companyMemberships.id),
    )
    .innerJoin(users, eq(companyMemberships.userId, users.id))
    .where(filter);
  const total = Number(totalRow?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(options.page ?? 1, 1), totalPages);
  const mappings = await db
    .select({
      id: crmUserMappings.id,
      membershipId: crmUserMappings.membershipId,
      externalUserId: crmUserMappings.externalUserId,
      externalEmail: crmUserMappings.externalEmail,
      employeeName: users.name,
      employeeEmail: users.email,
    })
    .from(crmUserMappings)
    .innerJoin(
      companyMemberships,
      eq(crmUserMappings.membershipId, companyMemberships.id),
    )
    .innerJoin(users, eq(companyMemberships.userId, users.id))
    .where(filter)
    .orderBy(asc(users.name))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  return {
    mappings,
    pagination: { page, pageSize, total, totalPages },
  };
}

export async function listMemberTasks(companyId: string, membershipId: string) {
  return getDb()
    .select({
      id: tasks.id,
      externalId: tasks.externalId,
      title: tasks.title,
      description: tasks.description,
      project: tasks.project,
      sourceUrl: tasks.sourceUrl,
      sourceStatus: tasks.sourceStatus,
      status: tasks.status,
      priority: tasks.priority,
      points: tasks.points,
      dueAt: tasks.dueAt,
      completedAt: tasks.completedAt,
      pointsAwardedAt: tasks.pointsAwardedAt,
      lastSyncedAt: tasks.lastSyncedAt,
      sourceName: crmIntegrations.name,
      sourceProvider: crmIntegrations.provider,
    })
    .from(tasks)
    .innerJoin(crmIntegrations, eq(tasks.integrationId, crmIntegrations.id))
    .where(
      and(
        eq(tasks.companyId, companyId),
        eq(tasks.assignedMembershipId, membershipId),
      ),
    )
    .orderBy(desc(tasks.updatedAt));
}

export async function pullCrmTasksOnDemand(companyId: string) {
  const integrations = await getDb()
    .select({
      id: crmIntegrations.id,
      provider: crmIntegrations.provider,
      name: crmIntegrations.name,
      baseUrl: crmIntegrations.baseUrl,
    })
    .from(crmIntegrations)
    .where(
      and(
        eq(crmIntegrations.companyId, companyId),
        eq(crmIntegrations.status, "active"),
        isNull(crmIntegrations.deletedAt),
      ),
    );

  for (const integration of integrations) {
    if (
      !integration.baseUrl ||
      !["test-crm", "custom"].includes(integration.provider)
    ) {
      continue;
    }

    try {
      const endpoint = new URL("/api/tasks", integration.baseUrl);
      const response = await fetch(endpoint, {
        headers: { accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) {
        throw new Error(`CRM вернула HTTP ${response.status}`);
      }
      const payload = pullResponseSchema.parse(await response.json());
      const sourceStatuses = {
        new: "OPEN",
        progress: "IN_PROGRESS",
        done: "COMPLETED",
        cancelled: "CANCELLED",
      } as const;
      const observedAt = new Date().toISOString();
      await syncCrmTasks(
        integration.id,
        crmSyncSchema.parse({
          observedAt,
          tasks: payload.tasks.map((task) => ({
            externalId: task.id,
            externalAssigneeId: task.assigneeId ?? null,
            title: task.title,
            description: task.description ?? null,
            project: task.project ?? null,
            sourceUrl: new URL(
              `/#${encodeURIComponent(task.id)}`,
              integration.baseUrl!,
            ).toString(),
            sourceStatus: sourceStatuses[task.status],
            status: task.status,
            priority: task.priority,
            points: task.points,
            dueAt: task.dueAt ?? null,
            completedAt: task.completedAt ?? null,
            sourcePayload: { provider: integration.provider },
          })),
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "неизвестная ошибка";
      throw new Error(
        `Не удалось получить задачи из «${integration.name}»: ${message}`,
      );
    }
  }
}

async function awardTaskPoints(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  task: {
    id: string;
    companyId: string;
    assignedMembershipId: string | null;
    points: number;
    externalId: string;
  },
  observedAt: Date,
) {
  if (!task.assignedMembershipId || task.points <= 0) return false;
  const inserted = await tx
    .insert(pointLedger)
    .values({
      id: crypto.randomUUID(),
      companyId: task.companyId,
      membershipId: task.assignedMembershipId,
      taskId: task.id,
      amount: task.points,
      idempotencyKey: `task-completed:${task.id}`,
      metadata: { externalTaskId: task.externalId },
      createdAt: observedAt,
    })
    .onConflictDoNothing({ target: pointLedger.idempotencyKey })
    .returning({ id: pointLedger.id });
  if (!inserted[0]) return false;
  await tx
    .update(employeeProfiles)
    .set({
      activityPoints: sql`${employeeProfiles.activityPoints} + ${task.points}`,
      walletPoints: sql`${employeeProfiles.walletPoints} + ${task.points}`,
      updatedAt: observedAt,
    })
    .where(eq(employeeProfiles.membershipId, task.assignedMembershipId));
  await tx
    .update(tasks)
    .set({ pointsAwardedAt: observedAt })
    .where(eq(tasks.id, task.id));
  return true;
}

export async function syncCrmTasks(integrationId: string, input: SyncInput) {
  const db = getDb();
  const [integration] = await db
    .select()
    .from(crmIntegrations)
    .where(
      and(
        eq(crmIntegrations.id, integrationId),
        isNull(crmIntegrations.deletedAt),
      ),
    )
    .limit(1);
  if (!integration || integration.status !== "active") {
    throw Response.json(
      {
        error: {
          code: "INTEGRATION_NOT_ACTIVE",
          message: "Интеграция не найдена или приостановлена",
        },
      },
      { status: 404 },
    );
  }
  const mappings = await db
    .select({
      externalUserId: crmUserMappings.externalUserId,
      membershipId: crmUserMappings.membershipId,
    })
    .from(crmUserMappings)
    .innerJoin(
      companyMemberships,
      eq(crmUserMappings.membershipId, companyMemberships.id),
    )
    .where(
      and(
        eq(crmUserMappings.integrationId, integrationId),
        eq(companyMemberships.status, "active"),
      ),
    );
  const membershipByExternalId = new Map(
    mappings.map((mapping) => [mapping.externalUserId, mapping.membershipId]),
  );
  const observedAt = input.observedAt ? new Date(input.observedAt) : new Date();
  const configuredPoints = (
    integration.config as {
      pointsByPriority?: Partial<Record<"low" | "medium" | "high", number>>;
    }
  ).pointsByPriority;
  const summary = {
    received: input.tasks.length,
    created: 0,
    updated: 0,
    completed: 0,
    pointsAwarded: 0,
    unmapped: 0,
  };

  await db.transaction(async (tx) => {
    for (const incoming of input.tasks) {
      const membershipId = incoming.externalAssigneeId
        ? (membershipByExternalId.get(incoming.externalAssigneeId) ?? null)
        : null;
      if (incoming.externalAssigneeId && !membershipId) summary.unmapped += 1;
      const [existing] = await tx
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.integrationId, integrationId),
            eq(tasks.externalId, incoming.externalId),
          ),
        )
        .limit(1);
      const completedAt =
        incoming.status === "done"
          ? incoming.completedAt
            ? new Date(incoming.completedAt)
            : (existing?.completedAt ?? observedAt)
          : null;
      const values = {
        companyId: integration.companyId,
        integrationId,
        assignedMembershipId: membershipId,
        externalAssigneeId: incoming.externalAssigneeId ?? null,
        title: incoming.title,
        description: incoming.description ?? null,
        project: incoming.project ?? null,
        sourceUrl: incoming.sourceUrl ?? null,
        sourceStatus: incoming.sourceStatus,
        status: incoming.status,
        priority: incoming.priority,
        points:
          incoming.points ??
          existing?.points ??
          configuredPoints?.[incoming.priority] ??
          integration.defaultPoints,
        dueAt: incoming.dueAt ? new Date(incoming.dueAt) : null,
        completedAt,
        lastSyncedAt: observedAt,
        sourcePayload: incoming.sourcePayload,
        updatedAt: observedAt,
      } as const;
      let persisted;
      if (!existing) {
        const [created] = await tx
          .insert(tasks)
          .values({
            id: crypto.randomUUID(),
            externalId: incoming.externalId,
            ...values,
          })
          .returning();
        persisted = created;
        summary.created += 1;
      } else {
        const [updated] = await tx
          .update(tasks)
          .set(values)
          .where(eq(tasks.id, existing.id))
          .returning();
        persisted = updated;
        summary.updated += 1;
      }
      if (!persisted) continue;
      if (!existing || existing.status !== incoming.status) {
        await tx.insert(taskStatusHistory).values({
          id: crypto.randomUUID(),
          taskId: persisted.id,
          fromStatus: existing?.status ?? null,
          toStatus: incoming.status,
          sourceStatus: incoming.sourceStatus,
          observedAt,
        });
      }
      if (incoming.status === "done") {
        if (!existing || existing.status !== "done") summary.completed += 1;
        if (await awardTaskPoints(tx, persisted, observedAt))
          summary.pointsAwarded += persisted.points;
      }
    }
    await tx
      .update(crmIntegrations)
      .set({ lastSyncAt: observedAt, updatedAt: observedAt })
      .where(eq(crmIntegrations.id, integrationId));
  });
  return summary;
}
