import { prisma } from "@theorie-direkt/database";

export async function recordQuestionProgress(params: {
  userId: string;
  questionId: string;
  selectedOptionIds: string[];
  isCorrect: boolean;
  languageCode: string;
}) {
  const question = await prisma.question.findUniqueOrThrow({
    where: { id: params.questionId },
    include: {
      category: true,
      topic: true,
      answerOptions: { select: { id: true, key: true } },
    },
  });
  const selectedAnswerKey = question.answerOptions.find((option) =>
    params.selectedOptionIds.includes(option.id),
  )?.key ?? null;

  const progress = await prisma.userQuestionProgress.create({
    data: {
      userId: params.userId,
      questionId: params.questionId,
      selectedOptionIds: [...new Set(params.selectedOptionIds)],
      selectedAnswerKey,
      isCorrect: params.isCorrect,
      languageCode: params.languageCode,
      licenseCategoryId: question.categoryId,
      topicId: question.topicId,
    },
  });

  await updateTopicProgress(params.userId, question.topicId);
  await updateMistakeState(params.userId, params.questionId, params.isCorrect);
  await updateActiveQuizSessions(params.userId, params.questionId, params.isCorrect);
  return progress;
}

export async function updateTopicProgress(userId: string, topicId: string) {
  const [totalQuestions, answeredQuestions, correctAnswers, wrongAnswers] = await Promise.all([
    prisma.question.count({ where: { topicId, isActive: true } }),
    prisma.userQuestionProgress.findMany({
      where: { userId, topicId },
      distinct: ["questionId"],
      select: { questionId: true },
    }).then((rows) => rows.length),
    prisma.userQuestionProgress.count({ where: { userId, topicId, isCorrect: true } }),
    prisma.userQuestionProgress.count({ where: { userId, topicId, isCorrect: false } }),
  ]);

  const completedAt = totalQuestions > 0 && answeredQuestions >= totalQuestions ? new Date() : null;
  return prisma.userTopicProgress.upsert({
    where: { userId_topicId: { userId, topicId } },
    update: {
      totalQuestions,
      answeredQuestions,
      correctAnswers,
      wrongAnswers,
      completedAt,
    },
    create: {
      userId,
      topicId,
      totalQuestions,
      answeredQuestions,
      correctAnswers,
      wrongAnswers,
      completedAt,
    },
  });
}

export async function updateMistakeState(userId: string, questionId: string, isCorrect: boolean) {
  const existing = await prisma.userMistake.findUnique({
    where: { userId_questionId: { userId, questionId } },
  });
  if (isCorrect) {
    if (existing && !existing.resolvedAt) {
      return prisma.userMistake.update({
        where: { id: existing.id },
        data: { resolvedAt: new Date() },
      });
    }
    return existing;
  }

  if (!existing) {
    return prisma.userMistake.create({
      data: {
        userId,
        questionId,
        mistakeCount: 1,
        lastMistakeAt: new Date(),
      },
    });
  }
  return prisma.userMistake.upsert({
    where: { userId_questionId: { userId, questionId } },
    update: {
      mistakeCount: existing.mistakeCount + 1,
      lastMistakeAt: new Date(),
      resolvedAt: null,
    },
    create: {
      userId,
      questionId,
      mistakeCount: 1,
      lastMistakeAt: new Date(),
    },
  });
}

export async function updateActiveQuizSessions(
  userId: string,
  questionId: string,
  isCorrect: boolean,
) {
  const sessions = await prisma.quizSession.findMany({
    where: { userId, status: "IN_PROGRESS" },
    select: { id: true, questionIds: true, correctAnswers: true, wrongAnswers: true },
  });
  const matching = sessions.filter((session) => session.questionIds.includes(questionId));
  if (!matching.length) return;
  await Promise.all(
    matching.map((session) =>
      prisma.quizSession.update({
        where: { id: session.id },
        data: {
          correctAnswers: session.correctAnswers + (isCorrect ? 1 : 0),
          wrongAnswers: session.wrongAnswers + (isCorrect ? 0 : 1),
        },
      }),
    ),
  );
}

export async function finishQuizSession(sessionId: string, userId: string) {
  const session = await prisma.quizSession.findFirstOrThrow({
    where: { id: sessionId, userId, status: "IN_PROGRESS" },
    include: { answers: true },
  });
  const score = session.answers.filter((answer) => answer.isCorrect).length;
  return prisma.quizSession.update({
    where: { id: session.id },
    data: {
      status: "FINISHED",
      score,
      finishedAt: new Date(),
      correctAnswers: score,
      wrongAnswers: session.answers.length - score,
    },
  });
}

