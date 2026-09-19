import { z } from "zod";

export const createCrmIntegrationSchema = z.object({
  provider: z.string().trim().min(2).max(50),
  name: z.string().trim().min(2).max(100),
  baseUrl: z.url().optional().nullable(),
  defaultPoints: z.number().int().min(0).max(100_000).default(100),
  config: z.record(z.string(), z.unknown()).default({}),
});

export const updateCrmIntegrationSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    baseUrl: z.url().optional().nullable(),
    defaultPoints: z.number().int().min(0).max(100_000).optional(),
    status: z.enum(["active", "paused"]).optional(),
    config: z.record(z.string(), z.unknown()).optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "Нужно передать хотя бы одно изменение",
  );

export const createCrmUserMappingSchema = z.object({
  membershipId: z.string().min(1),
  externalUserId: z.string().trim().min(1).max(255),
  externalEmail: z.email().optional().nullable(),
});

export const syncedTaskSchema = z.object({
  externalId: z.string().trim().min(1).max(255),
  externalAssigneeId: z.string().trim().min(1).max(255).nullable().optional(),
  title: z.string().trim().min(1).max(500),
  description: z.string().max(20_000).nullable().optional(),
  project: z.string().max(255).nullable().optional(),
  sourceUrl: z.url().nullable().optional(),
  sourceStatus: z.string().trim().min(1).max(100),
  status: z.enum(["new", "progress", "done", "cancelled"]),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  workStyle: z
    .enum(["explorer", "organizer", "connector", "supporter", "stabilizer"])
    .nullable()
    .optional(),
  points: z.number().int().min(0).max(100_000).optional(),
  dueAt: z.iso.datetime({ offset: true }).nullable().optional(),
  completedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  sourcePayload: z.record(z.string(), z.unknown()).default({}),
});

export const crmSyncSchema = z.object({
  observedAt: z.iso.datetime({ offset: true }).optional(),
  tasks: z.array(syncedTaskSchema).max(1_000),
});
