import { Router } from "express";
import { prisma } from "@theorie-direkt/database";
import { serializeQuestion } from "../services/questions.js";
import { getRequestLanguageCode } from "../services/request-context.js";

export const progressRouter = Router();

progressRouter.get("/mistakes", async (req, res) => {
  const languageCode = await getRequestLanguageCode(req.userId!);
  const latest = await prisma.userMistake.findMany({
    where: { userId: req.userId!, resolvedAt: null },
    orderBy: { lastMistakeAt: "desc" },
    take: 50,
  });
  res.json(await Promise.all(latest.map((mistake) => serializeQuestion(mistake.questionId, req.userId!, languageCode))));
});

progressRouter.get("/bookmarks", async (req, res) => {
  const bookmarks = await prisma.savedQuestion.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: "desc" },
  });
  res.json(
    await Promise.all(bookmarks.map((bookmark) => serializeQuestion(bookmark.questionId, req.userId!))),
  );
});

progressRouter.get("/statistics", async (req, res) => {
  const [totalAnswers, correctAnswers, uniqueQuestions, bookmarks, exams, mistakes, access] = await Promise.all([
    prisma.userQuestionProgress.count({ where: { userId: req.userId! } }),
    prisma.userQuestionProgress.count({ where: { userId: req.userId!, isCorrect: true } }),
    prisma.userQuestionProgress.findMany({
      where: { userId: req.userId! },
      distinct: ["questionId"],
      select: { questionId: true },
    }),
    prisma.savedQuestion.count({ where: { userId: req.userId! } }),
    prisma.quizSession.findMany({
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
    prisma.userMistake.count({ where: { userId: req.userId!, resolvedAt: null } }),
    prisma.userAccess.findFirst({
      where: {
        userId: req.userId!,
        isActive: true,
        revokedAt: null,
        OR: [{ isLifetime: true }, { expiresAt: { gt: new Date() } }],
      },
      include: { product: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  res.json({
    totalAnswers,
    correctAnswers,
    accuracy: totalAnswers ? Math.round((correctAnswers / totalAnswers) * 100) : 0,
    questionsSeen: uniqueQuestions.length,
    bookmarks,
    mistakes,
    access: access
      ? {
          hasActiveAccess: true,
          accessUntil: access.expiresAt?.toISOString() ?? null,
          isLifetime: access.isLifetime,
          source: access.source,
          activeProductTitle: access.product?.title ?? null,
        }
      : {
          hasActiveAccess: false,
          accessUntil: null,
          isLifetime: false,
          source: null,
          activeProductTitle: null,
        },
    recentExams: exams,
  });
});

progressRouter.get("/me", async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    include: {
      interfaceLanguage: true,
      selectedCategory: true,
      userAccesses: {
        where: {
          isActive: true,
          revokedAt: null,
          OR: [{ isLifetime: true }, { expiresAt: { gt: new Date() } }],
        },
        include: { product: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  if (!user) {
    res.status(404).json({ error: "User not found." });
    return;
  }
  const profile = await buildProfile(req.userId!);
  res.json({
    ...profile,
    telegramId: user.telegramId.toString(),
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    interfaceLanguage: user.interfaceLanguage?.code ?? "en",
    selectedCategory: user.selectedCategory?.code ?? "B",
    isBlocked: user.isBlocked,
    isAdmin: user.isAdmin,
    adminNote: user.adminNote,
    activeAccess: user.userAccesses[0]
      ? {
          hasActiveAccess: true,
          accessUntil: user.userAccesses[0].expiresAt?.toISOString() ?? null,
          isLifetime: user.userAccesses[0].isLifetime,
          source: user.userAccesses[0].source,
          activeProductTitle: user.userAccesses[0].product?.title ?? null,
        }
      : {
          hasActiveAccess: false,
          accessUntil: null,
          isLifetime: false,
          source: null,
          activeProductTitle: null,
        },
  });
});

async function buildProfile(userId: string) {
  const [user, stats, savedCount, mistakeCount, progressTopics, progressCategoryIds] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        interfaceLanguage: true,
        selectedCategory: true,
        userAccesses: {
          where: {
            isActive: true,
            revokedAt: null,
            OR: [{ isLifetime: true }, { expiresAt: { gt: new Date() } }],
          },
          include: { product: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),
    getAnswerStatistics(userId),
    prisma.savedQuestion.count({ where: { userId } }),
    prisma.userMistake.count({ where: { userId, resolvedAt: null } }),
    prisma.userTopicProgress.findMany({
      where: { userId },
      include: {
        topic: {
          include: {
            translations: {
              include: { language: true },
            },
          },
        },
      },
    }),
    prisma.userQuestionProgress.findMany({
      where: { userId },
      distinct: ["licenseCategoryId"],
      select: { licenseCategoryId: true },
    }),
  ]);
  const interfaceLanguageCode = user.interfaceLanguage?.code ?? "en";
  const categoryProgress = await Promise.all(
    progressCategoryIds
      .map((row) => row.licenseCategoryId)
      .filter((categoryId): categoryId is string => Boolean(categoryId))
      .map(async (categoryId) => {
        const [category, totalQuestions, answeredQuestions, correctAnswers] = await Promise.all([
          prisma.licenseCategory.findUnique({ where: { id: categoryId }, select: { id: true, code: true, name: true } }),
          prisma.question.count({ where: { categoryId, isActive: true } }),
          prisma.userQuestionProgress.count({ where: { userId, licenseCategoryId: categoryId } }),
          prisma.userQuestionProgress.count({ where: { userId, licenseCategoryId: categoryId, isCorrect: true } }),
        ]);
        if (!category) return null;
        return {
          categoryId: category.id,
          categoryCode: category.code,
          categoryName: category.name,
          totalQuestions,
          answeredQuestions,
          correctAnswers,
          wrongAnswers: answeredQuestions - correctAnswers,
          completed: totalQuestions > 0 && answeredQuestions >= totalQuestions,
        };
      }),
  );
  return {
    user: {
      telegramId: user.telegramId.toString(),
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      languageCode: user.languageCode,
      photoUrl: user.photoUrl,
      interfaceLanguage: user.interfaceLanguage?.code ?? "en",
      selectedCategory: user.selectedCategory?.code ?? "B",
      firstSeenAt: user.firstSeenAt.toISOString(),
      lastSeenAt: user.lastSeenAt.toISOString(),
      isBlocked: user.isBlocked,
      isAdmin: user.isAdmin,
      adminNote: user.adminNote,
    },
    access: user.userAccesses[0]
      ? {
          hasActiveAccess: true,
          accessUntil: user.userAccesses[0].expiresAt?.toISOString() ?? null,
          isLifetime: user.userAccesses[0].isLifetime,
          source: user.userAccesses[0].source,
          activeProductTitle: user.userAccesses[0].product?.title ?? null,
        }
      : {
          hasActiveAccess: false,
          accessUntil: null,
          isLifetime: false,
          source: null,
          activeProductTitle: null,
    },
    statistics: stats,
    savedCount,
    mistakeCount,
    completedTopics: progressTopics.filter((progress) => progress.completedAt).length,
    completedCategories: categoryProgress.filter((progress) => progress?.completed).length,
    categoryProgress: categoryProgress.filter((progress): progress is NonNullable<typeof progress> => Boolean(progress)),
    topicProgress: progressTopics.map((progress) => ({
      topicId: progress.topicId,
      topicSlug: progress.topic.slug,
      topicName:
        progress.topic.translations.find((translation) => translation.language.code === interfaceLanguageCode)?.name ??
        progress.topic.slug,
      totalQuestions: progress.totalQuestions,
      answeredQuestions: progress.answeredQuestions,
      correctAnswers: progress.correctAnswers,
      wrongAnswers: progress.wrongAnswers,
      completedAt: progress.completedAt?.toISOString() ?? null,
    })),
  };
}

async function getAnswerStatistics(userId: string) {
  const [totalAnswers, correctAnswers, uniqueQuestions, bookmarks, exams, mistakes] = await Promise.all([
    prisma.userQuestionProgress.count({ where: { userId } }),
    prisma.userQuestionProgress.count({ where: { userId, isCorrect: true } }),
    prisma.userQuestionProgress.findMany({
      where: { userId },
      distinct: ["questionId"],
      select: { questionId: true },
    }),
    prisma.savedQuestion.count({ where: { userId } }),
    prisma.quizSession.findMany({
      where: { userId, status: "FINISHED" },
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
    prisma.userMistake.count({ where: { userId, resolvedAt: null } }),
  ]);
  return {
    totalAnswers,
    correctAnswers,
    wrongAnswers: totalAnswers - correctAnswers,
    accuracy: totalAnswers ? Math.round((correctAnswers / totalAnswers) * 100) : 0,
    questionsSeen: uniqueQuestions.length,
    bookmarks,
    mistakes,
    recentExams: exams,
  };
}

progressRouter.get("/me/profile", async (req, res) => {
  res.json((await buildProfile(req.userId!)).user);
});

progressRouter.get("/me/progress", async (req, res) => {
  const [profile, sessions] = await Promise.all([
    buildProfile(req.userId!),
    prisma.quizSession.findMany({
      where: { userId: req.userId! },
      orderBy: { startedAt: "desc" },
      take: 1,
      select: {
        id: true,
        mode: true,
        category: { select: { code: true } },
        topic: { select: { id: true, slug: true } },
        questionIds: true,
        score: true,
        totalQuestions: true,
        startedAt: true,
        finishedAt: true,
      },
    }),
  ]);
  const latestProgress = await prisma.userQuestionProgress.findFirst({
    where: { userId: req.userId! },
    orderBy: { answeredAt: "desc" },
    select: { questionId: true, topicId: true, licenseCategoryId: true, answeredAt: true },
  });
  res.json({
    ...profile,
    lastSession: sessions[0] ?? null,
    lastQuestionId: latestProgress?.questionId ?? null,
    lastTopicId: latestProgress?.topicId ?? null,
    lastCategoryId: latestProgress?.licenseCategoryId ?? null,
    lastAnsweredAt: latestProgress?.answeredAt.toISOString() ?? null,
  });
});

progressRouter.get("/me/statistics", async (req, res) => {
  res.json((await buildProfile(req.userId!)).statistics);
});

progressRouter.get("/me/mistakes", async (req, res) => {
  const languageCode = await getRequestLanguageCode(req.userId!);
  const mistakes = await prisma.userMistake.findMany({
    where: { userId: req.userId!, resolvedAt: null },
    orderBy: { lastMistakeAt: "desc" },
  });
  res.json(
    await Promise.all(mistakes.map((mistake) => serializeQuestion(mistake.questionId, req.userId!, languageCode))),
  );
});

progressRouter.get("/me/saved", async (req, res) => {
  const languageCode = await getRequestLanguageCode(req.userId!);
  const saved = await prisma.savedQuestion.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: "desc" },
  });
  res.json(
    await Promise.all(
      saved.map((item) => serializeQuestion(item.questionId, req.userId!, languageCode)),
    ),
  );
});

progressRouter.post("/mistakes/:questionId/resolve", async (req, res) => {
  const mistake = await prisma.userMistake.findUnique({
    where: { userId_questionId: { userId: req.userId!, questionId: req.params.questionId } },
  });
  if (!mistake) {
    res.json({ resolved: false });
    return;
  }
  await prisma.userMistake.update({
    where: { id: mistake.id },
    data: { resolvedAt: new Date() },
  });
  res.json({ resolved: true });
});
