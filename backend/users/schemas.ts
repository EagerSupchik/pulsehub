import { z } from "zod";
import { companyRoleSchema } from "@/backend/shared/validation";

export const createEmployeeSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(10).max(128),
  role: companyRoleSchema.default("employee"),
  departmentId: z.uuid().nullable().optional(),
  jobTitle: z.string().trim().max(120).nullable().optional(),
});

export const updateMembershipSchema = z
  .object({
    role: companyRoleSchema.optional(),
    status: z.enum(["active", "suspended"]).optional(),
    departmentId: z.uuid().nullable().optional(),
    jobTitle: z.string().trim().max(120).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Нужно передать хотя бы одно изменение",
  });
