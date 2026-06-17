import { Router } from "express";
import { prisma } from "@theorie-direkt/database";
import { z } from "zod";
import { examAnswerSchema, examStartSchema } from "@theorie-direkt/shared";
import { gradeQuestion, getAvailableQuestionIds, serializeQuestion } from "../services/questions.js";
import { requireActiveAccess } from "../middleware/access.js";
import { finishQuizSession, recordQuestionProgress } from "../services/user-progress.js";
import { getRequestLanguageCode } from "../services/request-context.js";

export const examRouter = Router();

examRouter.use(requireActiveAccess);

const quizSessionStartSchema = examStartSchema.extend({
  topic: z.string().optional(),
  mode: z.enum(["PRACTICE", "EXAM", "MISTAKES", "SAVED"]).default("EXAM"),
  questionIds: z.array(z.string().cuid()).optional(),
});

examRouter.post("/start", async (req, res) => {
  const { category, questionCount, topic, mode, questionIds } = quizSessionStartSchema.parse(req.body);
  const languageCode = await getRequestLanguageCode(req.userId!);
  const categoryRecord = await prisma.licenseCategory.findUniqueOrThrow({
    where: { code: category },
  });
  const available = questionIds?.length
    ? questionIds
    : (await getAvailableQuestionIds(category, topic)).map((item) => item.id);
  const selectedQuestionIds = available
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.min(questionCount, available.length));
  if (!selectedQuestionIds.length) {
    res.status(404).json({
      error: `No exam questions are available for category ${category}.`,
      code: "NO_QUESTIONS",
      category,
      language: languageCode,
    });
    return;
  }
  const exam = await prisma.quizSession.create({
    data: {
      userId: req.userId!,
      categoryId: categoryRecord.id,
      topicId: topic ? (await prisma.topic.findUnique({ where: { slug: topic }, select: { id: true } }))?.id ?? null : null,
      languageCode,
      mode,
      questionIds: selectedQuestionIds,
      totalQuestions: selectedQuestionIds.length,
    },
  });
  res.status(201).json({
    id: exam.id,
    totalQuestions: exam.totalQuestions,
    question: await serializeQuestion(selectedQuestionIds[0]!, req.userId!, languageCode),
  });
});

examRouter.post("/:id/answer", async (req, res) => {
  const { questionId, optionIds } = examAnswerSchema.parse(req.body);
  const languageCode = await getRequestLanguageCode(req.userId!);
  const exam = await prisma.quizSession.findFirstOrThrow({
    where: { id: req.params.id, userId: req.userId!, status: "IN_PROGRESS" },
  });
  if (!exam.questionIds.includes(questionId)) {
    res.status(400).json({ error: "Question does not belong to this exam." });
    return;
  }
  const grade = await gradeQuestion(questionId, optionIds);
  await prisma.quizAnswer.upsert({
    where: { quizSessionId_questionId: { quizSessionId: exam.id, questionId } },
    update: { selectedOptionIds: optionIds, isCorrect: grade.isCorrect },
    create: {
      quizSessionId: exam.id,
      questionId,
      selectedOptionIds: optionIds,
      isCorrect: grade.isCorrect,
    },
  });
  await recordQuestionProgress({
    userId: req.userId!,
    questionId,
    selectedOptionIds: optionIds,
    isCorrect: grade.isCorrect,
    languageCode,
  });
  const currentIndex = exam.questionIds.indexOf(questionId);
  const nextId = exam.questionIds[currentIndex + 1];
  const currentQuestion = await serializeQuestion(questionId, req.userId!, languageCode);
  res.json({
    saved: true,
    currentIndex,
    isCorrect: grade.isCorrect,
    correctOptionIds: grade.correctOptionIds,
    explanation: currentQuestion.explanation,
    nextQuestion: nextId ? await serializeQuestion(nextId, req.userId!, languageCode) : null,
  });
});

examRouter.post("/:id/finish", async (req, res) => {
  const finished = await finishQuizSession(req.params.id, req.userId!);
  res.json({
    id: finished.id,
    score: finished.score ?? 0,
    totalQuestions: finished.totalQuestions,
    percentage: Math.round(((finished.score ?? 0) / finished.totalQuestions) * 100),
  });
});
