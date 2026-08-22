import { z } from "zod";

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(2).max(120),
});
