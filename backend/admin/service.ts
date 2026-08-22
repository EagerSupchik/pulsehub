import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import {
  accessRoles,
  accessRoleAssignments,
  aiSettings,
  eventRegistrations,
  events,
  notificationSettings,
  companyMemberships,
  employeeProfiles,
  users,
} from "@/db/schema";
import { jsonError } from "@/backend/shared/http";
import { encryptSecret } from "./secrets";

export async function listAccessRoles(companyId: string) {
  const db = getDb();
  const roles = await db
    .select()
    .from(accessRoles)
    .where(eq(accessRoles.companyId, companyId))
    .orderBy(asc(accessRoles.name));
  const roleIds = roles.map((role) => role.id);
  const assignments = roleIds.length
    ? await db
        .select({
          roleId: accessRoleAssignments.roleId,
          membershipId: accessRoleAssignments.membershipId,
        })
        .from(accessRoleAssignments)
        .where(inArray(accessRoleAssignments.roleId, roleIds))
    : [];
  return roles.map((role) => ({
    ...role,
    assignedMembershipIds: assignments
      .filter((item) => item.roleId === role.id)
      .map((item) => item.membershipId),
  }));
}

export async function listAssignableMembers(companyId: string) {
  return getDb()
    .select({
      membershipId: companyMemberships.id,
      name: users.name,
      email: users.email,
      jobTitle: employeeProfiles.jobTitle,
    })
    .from(companyMemberships)
    .innerJoin(users, eq(companyMemberships.userId, users.id))
    .leftJoin(
      employeeProfiles,
      eq(employeeProfiles.membershipId, companyMemberships.id),
    )
    .where(
      and(
        eq(companyMemberships.companyId, companyId),
        eq(companyMemberships.status, "active"),
        inArray(companyMemberships.role, ["employee", "manager", "hr"]),
      ),
    )
    .orderBy(asc(users.name));
}

export async function assignAccessRole(
  companyId: string,
  roleId: string,
  membershipId: string,
) {
  const db = getDb();
  const [role] = await db
    .select({ id: accessRoles.id })
    .from(accessRoles)
    .where(
      and(eq(accessRoles.id, roleId), eq(accessRoles.companyId, companyId)),
    )
    .limit(1);
  const [member] = await db
    .select({ id: companyMemberships.id })
    .from(companyMemberships)
    .where(
      and(
        eq(companyMemberships.id, membershipId),
        eq(companyMemberships.companyId, companyId),
      ),
    )
    .limit(1);
  if (!role || !member)
    throw jsonError(
      404,
      "ASSIGNMENT_TARGET_NOT_FOUND",
      "Роль или сотрудник не найдены",
    );
  await db
    .insert(accessRoleAssignments)
    .values({ id: crypto.randomUUID(), roleId, membershipId })
    .onConflictDoNothing();
}

export async function unassignAccessRole(
  companyId: string,
  roleId: string,
  membershipId: string,
) {
  await getDb()
    .delete(accessRoleAssignments)
    .where(
      and(
        eq(accessRoleAssignments.roleId, roleId),
        eq(accessRoleAssignments.membershipId, membershipId),
        inArray(
          accessRoleAssignments.roleId,
          getDb()
            .select({ id: accessRoles.id })
            .from(accessRoles)
            .where(eq(accessRoles.companyId, companyId)),
        ),
      ),
    );
}

export async function getAssignedPermissions(
  companyId: string,
  membershipId: string,
) {
  const rows = await getDb()
    .select({ permissions: accessRoles.permissions })
    .from(accessRoleAssignments)
    .innerJoin(accessRoles, eq(accessRoleAssignments.roleId, accessRoles.id))
    .where(
      and(
        eq(accessRoles.companyId, companyId),
        eq(accessRoleAssignments.membershipId, membershipId),
      ),
    );
  return [...new Set(rows.flatMap((row) => row.permissions))];
}

export async function createAccessRole(
  companyId: string,
  membershipId: string,
  input: { name: string; description?: string | null; permissions: string[] },
) {
  const [role] = await getDb()
    .insert(accessRoles)
    .values({
      id: crypto.randomUUID(),
      companyId,
      createdByMembershipId: membershipId,
      name: input.name,
      description: input.description ?? null,
      permissions: input.permissions,
    })
    .returning();
  return role;
}

export async function updateAccessRole(
  companyId: string,
  roleId: string,
  input: { name?: string; description?: string | null; permissions?: string[] },
) {
  const [role] = await getDb()
    .update(accessRoles)
    .set({ ...input, updatedAt: new Date() })
    .where(
      and(eq(accessRoles.id, roleId), eq(accessRoles.companyId, companyId)),
    )
    .returning();
  if (!role) throw jsonError(404, "ROLE_NOT_FOUND", "Роль не найдена");
  return role;
}

export async function deleteAccessRole(companyId: string, roleId: string) {
  const [role] = await getDb()
    .delete(accessRoles)
    .where(
      and(eq(accessRoles.id, roleId), eq(accessRoles.companyId, companyId)),
    )
    .returning({ id: accessRoles.id });
  if (!role) throw jsonError(404, "ROLE_NOT_FOUND", "Роль не найдена");
}

type NotificationSettingsInput = {
  emailEnabled: boolean;
  fromName: string;
  replyTo: string | null;
  taskAssigned: boolean;
  taskDueSoon: boolean;
  taskCompleted: boolean;
  eventRegistration: boolean;
  weeklyDigest: boolean;
  digestDay: number;
  eventRecipients: string[];
};

const notificationDefaults: NotificationSettingsInput = {
  emailEnabled: false,
  fromName: "PulseHub",
  replyTo: null,
  taskAssigned: true,
  taskDueSoon: true,
  taskCompleted: false,
  eventRegistration: true,
  weeklyDigest: true,
  digestDay: 1,
  eventRecipients: [] as string[],
};

export async function getNotificationSettings(companyId: string) {
  const [settings] = await getDb()
    .select()
    .from(notificationSettings)
    .where(eq(notificationSettings.companyId, companyId))
    .limit(1);
  return settings ?? notificationDefaults;
}

export async function saveNotificationSettings(
  companyId: string,
  membershipId: string,
  input: NotificationSettingsInput,
) {
  const now = new Date();
  const [settings] = await getDb()
    .insert(notificationSettings)
    .values({
      id: crypto.randomUUID(),
      companyId,
      updatedByMembershipId: membershipId,
      ...input,
      replyTo: input.replyTo || null,
    })
    .onConflictDoUpdate({
      target: notificationSettings.companyId,
      set: {
        ...input,
        replyTo: input.replyTo || null,
        updatedByMembershipId: membershipId,
        updatedAt: now,
      },
    })
    .returning();
  return settings;
}

const aiDefaults = {
  enabled: false,
  provider: "openai",
  model: "gpt-5-mini",
  baseUrl: null,
  systemPrompt: null,
  apiKeyLast4: null,
};

export async function getAiSettings(companyId: string) {
  const [settings] = await getDb()
    .select({
      enabled: aiSettings.enabled,
      provider: aiSettings.provider,
      model: aiSettings.model,
      baseUrl: aiSettings.baseUrl,
      systemPrompt: aiSettings.systemPrompt,
      apiKeyLast4: aiSettings.apiKeyLast4,
    })
    .from(aiSettings)
    .where(eq(aiSettings.companyId, companyId))
    .limit(1);
  return settings ?? aiDefaults;
}

export async function saveAiSettings(
  companyId: string,
  membershipId: string,
  input: {
    enabled: boolean;
    provider: string;
    model: string;
    baseUrl: string | null;
    systemPrompt: string | null;
    apiKey?: string;
    clearApiKey?: boolean;
  },
) {
  const secretValues = input.clearApiKey
    ? { apiKeyEncrypted: null, apiKeyLast4: null }
    : input.apiKey
      ? {
          apiKeyEncrypted: encryptSecret(input.apiKey),
          apiKeyLast4: input.apiKey.slice(-4),
        }
      : {};
  const values = {
    enabled: input.enabled,
    provider: input.provider,
    model: input.model,
    baseUrl: input.baseUrl || null,
    systemPrompt: input.systemPrompt || null,
    updatedByMembershipId: membershipId,
    ...secretValues,
  };
  await getDb()
    .insert(aiSettings)
    .values({ id: crypto.randomUUID(), companyId, ...values })
    .onConflictDoUpdate({
      target: aiSettings.companyId,
      set: { ...values, updatedAt: new Date() },
    });
  return getAiSettings(companyId);
}

export async function listAdminEvents(companyId: string) {
  return getDb()
    .select({
      id: events.id,
      title: events.title,
      description: events.description,
      kind: events.kind,
      location: events.location,
      startsAt: events.startsAt,
      endsAt: events.endsAt,
      capacity: events.capacity,
      status: events.status,
      registrations: count(eventRegistrations.id),
    })
    .from(events)
    .leftJoin(
      eventRegistrations,
      and(
        eq(eventRegistrations.eventId, events.id),
        eq(eventRegistrations.status, "registered"),
      ),
    )
    .where(eq(events.companyId, companyId))
    .groupBy(events.id)
    .orderBy(desc(events.startsAt));
}

export async function updateAdminEvent(
  companyId: string,
  eventId: string,
  input: Record<string, unknown>,
) {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.companyId, companyId)))
    .limit(1);
  if (!existing)
    throw jsonError(404, "EVENT_NOT_FOUND", "Мероприятие не найдено");
  const nextStartsAt =
    typeof input.startsAt === "string"
      ? new Date(input.startsAt)
      : existing.startsAt;
  const nextEndsAt =
    input.endsAt === null
      ? null
      : typeof input.endsAt === "string"
        ? new Date(input.endsAt)
        : existing.endsAt;
  if (nextEndsAt && nextEndsAt <= nextStartsAt)
    throw jsonError(
      400,
      "INVALID_EVENT_DATES",
      "Окончание должно быть позже начала",
    );
  const converted = {
    ...input,
    ...(typeof input.startsAt === "string"
      ? { startsAt: new Date(input.startsAt) }
      : {}),
    ...(typeof input.endsAt === "string"
      ? { endsAt: new Date(input.endsAt) }
      : {}),
    updatedAt: new Date(),
  };
  const [event] = await db
    .update(events)
    .set(converted)
    .where(and(eq(events.id, eventId), eq(events.companyId, companyId)))
    .returning();
  return event;
}

export async function deleteAdminEvent(companyId: string, eventId: string) {
  const [event] = await getDb()
    .delete(events)
    .where(and(eq(events.id, eventId), eq(events.companyId, companyId)))
    .returning({ id: events.id });
  if (!event) throw jsonError(404, "EVENT_NOT_FOUND", "Мероприятие не найдено");
}
