import { z } from "zod";

export const languageCodes = [
  "de",
  "en",
  "ru",
  "tr",
  "uz",
  "ar",
  "ro",
  "pl",
  "hr",
  "pt",
  "es",
  "it",
  "fr",
  "el",
] as const;

export type LanguageCode = (typeof languageCodes)[number];

export const licenseCategoryCodes = [
  "AM",
  "A1",
  "A2",
  "A",
  "B",
  "BF17",
  "B197",
  "B96",
  "BE",
  "C1",
  "C1E",
  "C",
  "CE",
  "D1",
  "D1E",
  "D",
  "DE",
  "L",
  "T",
] as const;

export type LicenseCategoryCode = (typeof licenseCategoryCodes)[number];

export const answerRequestSchema = z.object({
  optionIds: z.array(z.string().cuid()).min(1),
});

export const bookmarkRequestSchema = z.object({
  bookmarked: z.boolean().optional(),
});

export const telegramAuthSchema = z.object({
  initData: z.string(),
});

export const examStartSchema = z.object({
  category: z.enum(licenseCategoryCodes),
  questionCount: z.number().int().min(1).max(50).default(30),
});

export const examAnswerSchema = answerRequestSchema.extend({
  questionId: z.string().cuid(),
});

export const preferenceSchema = z.object({
  language: z.enum(languageCodes).optional(),
  category: z.enum(licenseCategoryCodes).optional(),
}).refine((value) => value.language || value.category, {
  message: "At least one preference is required.",
});

export type QuestionTypeValue = "SINGLE_CHOICE" | "MULTIPLE_CHOICE";

export interface ApiQuestion {
  id: string;
  externalId: string;
  type: QuestionTypeValue;
  difficulty: number;
  imageUrl: string | null;
  videoUrl: string | null;
  category: { code: string; name: string };
  topic: { id: string; slug: string; name: string };
  text: string;
  explanation: string | null;
  options: Array<{ id: string; key: string; text: string }>;
  bookmarked: boolean;
}
