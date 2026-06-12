import { Router } from "express";
import { prisma } from "@theorie-direkt/database";
import { examAnswerSchema, examStartSchema } from "@theorie-direkt/shared";
import { gradeQuestion, serializeQuestion } from "../services/questions.js";
import {
  getRequestLanguageCode,
} from "../services/request-context.js";

export const examRouter = Router();

examRouter.post("/start", async (req, res) => {
  const { category, questionCount } = examStartSchema.parse(req.body);
  const languageCode = await getRequestLanguageCode(req.userId!);
  const categoryRecord = await prisma.licenseCategory.findUniqueOrThrow({
    where: { code: category },
  });
  const available = await prisma.question.findMany({
    where: { categoryId: categoryRecord.id, isActive: true },
    select: { id: true },
  });
  const questionIds = available
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.min(questionCount, available.length))
    .map(({ id }) => id);
  if (!questionIds.length) {
    res.status(404).json({
      error: `No exam questions are available for category ${category}.`,
      code: "NO_QUESTIONS",
      category,
      language: languageCode,
    });
    return;
  }
  const exam = await prisma.examSession.create({
    data: {
      userId: req.userId!,
      categoryId: categoryRecord.id,
      questionIds,
      totalQuestions: questionIds.length,
    },
  });
  res.status(201).json({
    id: exam.id,
    totalQuestions: exam.totalQuestions,
    question: await serializeQuestion(questionIds[0]!, req.userId!, languageCode),
  });
});

examRouter.post("/:id/answer", async (req, res) => {
  const { questionId, optionIds } = examAnswerSchema.parse(req.body);
  const languageCode = await getRequestLanguageCode(req.userId!);
  const exam = await prisma.examSession.findFirstOrThrow({
    where: { id: req.params.id, userId: req.userId!, status: "IN_PROGRESS" },
  });
  if (!exam.questionIds.includes(questionId)) {
    res.status(400).json({ error: "Question does not belong to this exam." });
    return;
  }
  const grade = await gradeQuestion(questionId, optionIds);
  await prisma.examAnswer.upsert({
    where: { examSessionId_questionId: { examSessionId: exam.id, questionId } },
    update: { selectedOptionIds: optionIds, isCorrect: grade.isCorrect },
    create: {
      examSessionId: exam.id,
      questionId,
      selectedOptionIds: optionIds,
      isCorrect: grade.isCorrect,
    },
  });
  const currentIndex = exam.questionIds.indexOf(questionId);
  const nextId = exam.questionIds[currentIndex + 1];
  res.json({
    saved: true,
    currentIndex,
    nextQuestion: nextId ? await serializeQuestion(nextId, req.userId!, languageCode) : null,
  });
});

examRouter.post("/:id/finish", async (req, res) => {
  const exam = await prisma.examSession.findFirstOrThrow({
    where: { id: req.params.id, userId: req.userId!, status: "IN_PROGRESS" },
    include: { answers: true },
  });
  const score = exam.answers.filter((answer) => answer.isCorrect).length;
  const finished = await prisma.examSession.update({
    where: { id: exam.id },
    data: { status: "FINISHED", score, finishedAt: new Date() },
  });
  res.json({
    id: finished.id,
    score,
    totalQuestions: finished.totalQuestions,
    percentage: Math.round((score / finished.totalQuestions) * 100),
  });
});
