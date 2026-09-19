import { z } from "zod";
import { personalityQuestions } from "./model";

const answerIds = new Set<string>(personalityQuestions.map((question) => question.id));

export const personalityAssessmentSchema = z
  .object({
    answers: z.record(z.string(), z.number().int().min(1).max(5)),
    consent: z.literal(true),
    shareWithManagers: z.boolean().default(false),
  })
  .superRefine((value, context) => {
    const keys = Object.keys(value.answers);
    if (
      keys.length !== personalityQuestions.length ||
      keys.some((key) => !answerIds.has(key))
    ) {
      context.addIssue({
        code: "custom",
        path: ["answers"],
        message: "Нужно ответить на все вопросы оценки",
      });
    }
  });
