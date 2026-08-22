import { z } from "zod";

export const activityThresholdsSchema = z
  .object({
    yellowMinimum: z.number().int().min(0).max(1_000_000),
    greenMinimum: z.number().int().min(1).max(1_000_000),
  })
  .refine((value) => value.greenMinimum > value.yellowMinimum, {
    message:
      "Порог высокой активности должен быть выше порога стабильной активности",
    path: ["greenMinimum"],
  });
