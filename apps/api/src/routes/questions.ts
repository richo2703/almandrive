import { Router } from "express";
import { prisma } from "@theorie-direkt/database";
import {
  answerRequestSchema,
  bookmarkRequestSchema,
  licenseCategoryCodes,
} from "@theorie-direkt/shared";
import {
  getAvailableQuestionIds,
  gradeQuestion,
  serializeQuestion,
} from "../services/questions.js";
import { recordQuestionProgress } from "../services/user-progress.js";
import {
  getRequestCategoryCode,
  getRequestLanguageCode,
} from "../services/request-context.js";

export const questionRouter = Router();

questionRouter.get("/next", async (req, res) => {
  const category = String(req.query.category ?? (await getRequestCategoryCode(req.userId!)));
  if (!licenseCategoryCodes.includes(category as (typeof licenseCategoryCodes)[number])) {
    res.status(400).json({ error: "Unknown license category.", code: "INVALID_CATEGORY" });
    return;
  }
  const topic = req.query.topic ? String(req.query.topic) : undefined;
  const languageCode = await getRequestLanguageCode(req.userId!);
  const answered = await prisma.userQuestionProgress.findMany({
    where: { userId: req.userId! },
    select: { questionId: true },
    distinct: ["questionId"],
  });
  const baseCandidates = await getAvailableQuestionIds(category, topic);
  let candidates = baseCandidates.filter((candidate) => !answered.some((item) => item.questionId === candidate.id));
  if (!candidates.length) {
    candidates = baseCandidates;
  }
  if (!candidates.length) {
    res.status(404).json({
      error: `No questions are available for category ${category}.`,
      code: "NO_QUESTIONS",
      category,
      language: languageCode,
    });
    return;
  }
  const chosen = candidates[Math.floor(Math.random() * candidates.length)]!;
  res.json(await serializeQuestion(chosen.id, req.userId!, languageCode));
});

questionRouter.get("/:id", async (req, res) => {
  const languageCode = await getRequestLanguageCode(req.userId!);
  res.json(await serializeQuestion(req.params.id, req.userId!, languageCode));
});

questionRouter.post("/:id/answer", async (req, res) => {
  const { optionIds } = answerRequestSchema.parse(req.body);
  const languageCode = await getRequestLanguageCode(req.userId!);
  const grade = await gradeQuestion(req.params.id, optionIds);
  await recordQuestionProgress({
    userId: req.userId!,
    questionId: req.params.id,
    selectedOptionIds: optionIds,
    isCorrect: grade.isCorrect,
    languageCode,
  });
  const question = await serializeQuestion(req.params.id, req.userId!, languageCode);
  res.json({ ...grade, explanation: question.explanation });
});

questionRouter.post("/:id/bookmark", async (req, res) => {
  const { bookmarked } = bookmarkRequestSchema.parse(req.body);
  const existing = await prisma.savedQuestion.findUnique({
    where: { userId_questionId: { userId: req.userId!, questionId: req.params.id } },
  });
  const shouldBookmark = bookmarked ?? !existing;
  if (shouldBookmark && !existing) {
    await prisma.savedQuestion.create({
      data: { userId: req.userId!, questionId: req.params.id },
    });
  } else if (!shouldBookmark && existing) {
    await prisma.savedQuestion.delete({ where: { id: existing.id } });
  }
  res.json({ bookmarked: shouldBookmark });
});

questionRouter.post("/:id/save", async (req, res) => {
  const existing = await prisma.savedQuestion.findUnique({
    where: { userId_questionId: { userId: req.userId!, questionId: req.params.id } },
  });
  if (!existing) {
    await prisma.savedQuestion.create({ data: { userId: req.userId!, questionId: req.params.id } });
  }
  res.json({ saved: true });
});

questionRouter.delete("/:id/save", async (req, res) => {
  const existing = await prisma.savedQuestion.findUnique({
    where: { userId_questionId: { userId: req.userId!, questionId: req.params.id } },
  });
  if (existing) {
    await prisma.savedQuestion.delete({ where: { id: existing.id } });
  }
  res.json({ saved: false });
});
