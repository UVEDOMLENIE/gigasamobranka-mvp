import { z } from "zod";

/** Запрос на генерацию набора карточек. */
export const GenerateInputSchema = z.object({
  subject: z.string().min(1).max(80),
  grade: z.string().min(1).max(20),
  topic: z.string().min(1).max(200),
  count: z.number().int().min(1).max(30),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  sources: z
    .array(
      z.object({
        filename: z.string(),
        text: z.string(),
      }),
    )
    .min(1)
    .max(20),
});
export type GenerateInput = z.infer<typeof GenerateInputSchema>;

/** Одна сгенерированная карточка от LLM. */
export const CardDraftSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  source: z.string().optional().default(""),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
});
export type CardDraft = z.infer<typeof CardDraftSchema>;

export const CardDraftArraySchema = z.array(CardDraftSchema);
