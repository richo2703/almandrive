import { Router } from "express";
import { prisma } from "@theorie-direkt/database";
import { serializeQuestion } from "../services/questions.js";

export const progressRouter = Router();

progressRouter.get("/mistakes", async (req, res) => {
  const latest = await prisma.userAnswer.findMany({
    where: { userId: req.userId!, isCorrect: false },
    orderBy: { answeredAt: "desc" },
    distinct: ["questionId"],
    take: 50,
  });
  res.json(await Promise.all(latest.map((answer) => serializeQuestion(answer.questionId, req.userId!))));
});

progressRouter.get("/bookmarks", async (req, res) => {
  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: "desc" },
  });
  res.json(
    await Promise.all(bookmarks.map((bookmark) => serializeQuestion(bookmark.questionId, req.userId!))),
  );
});

progressRouter.get("/statistics", async (req, res) => {
  const [totalAnswers, correctAnswers, uniqueQuestions, bookmarks, exams] = await Promise.all([
    prisma.userAnswer.count({ where: { userId: req.userId! } }),
    prisma.userAnswer.count({ where: { userId: req.userId!, isCorrect: true } }),
    prisma.userAnswer.findMany({
      where: { userId: req.userId! },
      distinct: ["questionId"],
      select: { questionId: true },
    }),
    prisma.bookmark.count({ where: { userId: req.userId! } }),
    prisma.examSession.findMany({
      where: { userId: req.userId!, status: "FINISHED" },
      orderBy: { finishedAt: "desc" },
      take: 5,
      select: {
        id: true,
        score: true,
        totalQuestions: true,
        finishedAt: true,
        category: { select: { code: true } },
      },
    }),
  ]);
  res.json({
    totalAnswers,
    correctAnswers,
    accuracy: totalAnswers ? Math.round((correctAnswers / totalAnswers) * 100) : 0,
    questionsSeen: uniqueQuestions.length,
    bookmarks,
    recentExams: exams,
  });
});
