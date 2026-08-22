import { z } from "zod";

export const createEventSchema = z.object({
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(3000).optional().nullable(),
  kind: z.string().trim().min(2).max(80).default("Компания"),
  location: z.string().trim().min(2).max(250),
  startsAt: z.iso.datetime({ offset: true }),
  endsAt: z.iso.datetime({ offset: true }).optional().nullable(),
  capacity: z.number().int().min(1).max(100000),
});
