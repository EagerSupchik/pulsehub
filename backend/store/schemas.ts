import { z } from "zod";

export const createBonusSchema = z.object({
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(2000).optional().nullable(),
  category: z.string().trim().min(2).max(80),
  price: z.number().int().min(1).max(1_000_000),
  emoji: z.string().trim().min(1).max(12).default("✦"),
  tint: z.enum(["blue", "peach", "mint", "violet"]).default("blue"),
  stock: z.number().int().min(0).max(1_000_000).optional().nullable(),
});

export const updateBonusSchema = createBonusSchema
  .partial()
  .extend({
    status: z.enum(["active", "archived"]).optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "Нужно передать хотя бы одно изменение",
  );

export const updateRedemptionSchema = z.object({
  status: z.enum(["approved", "fulfilled", "cancelled"]),
});
