import { z } from "zod";

export const permissionKeys = [
  "users.manage",
  "roles.manage",
  "events.manage",
  "events.registrations.read",
  "bonuses.manage",
  "activity.company.read",
  "activity.settings.manage",
  "crm.manage",
  "notifications.manage",
  "ai.manage",
] as const;

export const createAccessRoleSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(300).optional().nullable(),
  permissions: z
    .array(z.enum(permissionKeys))
    .max(permissionKeys.length)
    .default([]),
});

export const updateAccessRoleSchema = createAccessRoleSchema
  .partial()
  .refine(
    (value) => Object.keys(value).length > 0,
    "Нужно передать хотя бы одно изменение",
  );

export const accessRoleAssignmentSchema = z.object({
  membershipId: z.string().uuid(),
});

export const notificationSettingsSchema = z.object({
  emailEnabled: z.boolean(),
  fromName: z.string().trim().min(2).max(100),
  replyTo: z.union([z.email(), z.literal("")]).nullable(),
  taskAssigned: z.boolean(),
  taskDueSoon: z.boolean(),
  taskCompleted: z.boolean(),
  eventRegistration: z.boolean(),
  weeklyDigest: z.boolean(),
  digestDay: z.number().int().min(1).max(7),
  eventRecipients: z.array(z.email()).max(50),
});

export const aiSettingsSchema = z.object({
  enabled: z.boolean(),
  provider: z.enum(["openai", "azure-openai", "custom"]),
  model: z.string().trim().min(1).max(100),
  baseUrl: z.union([z.url(), z.literal("")]).nullable(),
  systemPrompt: z.string().trim().max(10_000).nullable(),
  apiKey: z.string().trim().min(8).max(500).optional(),
  clearApiKey: z.boolean().optional().default(false),
});

export const updateAdminEventSchema = z
  .object({
    title: z.string().trim().min(2).max(180).optional(),
    description: z.string().trim().max(3000).optional().nullable(),
    kind: z.string().trim().min(2).max(80).optional(),
    location: z.string().trim().min(2).max(250).optional(),
    startsAt: z.iso.datetime({ offset: true }).optional(),
    endsAt: z.iso.datetime({ offset: true }).optional().nullable(),
    capacity: z.number().int().min(1).max(100000).optional(),
    status: z.enum(["published", "cancelled"]).optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "Нужно передать хотя бы одно изменение",
  );
