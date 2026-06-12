import { prisma } from "@theorie-direkt/database";

type LanguageRow = { language: { code: string } };

type QuestionTranslationRow = LanguageRow & {
  text: string;
  explanation: string | null;
};

type OptionTranslationRow = LanguageRow & {
  text: string;
};

type TopicTranslationRow = LanguageRow & {
  name: string;
};

function pickTranslation<T extends LanguageRow>(rows: T[], languageCode: string) {
  return (
    rows.find((row) => row.language.code === languageCode) ??
    rows.find((row) => row.language.code === "en") ??
    rows[0] ??
    null
  );
}

async function resolveQuestionTranslation(questionId: string, languageCode: string) {
  const translations = await prisma.questionTranslation.findMany({
    where: {
      questionId,
      language: { code: { in: [...new Set([languageCode, "en"])] } },
    },
    include: { language: { select: { code: true } } },
  });
  return pickTranslation(translations as QuestionTranslationRow[], languageCode);
}

async function resolveOptionTranslations(questionId: string, languageCode: string) {
  const rows = await prisma.answerOption.findMany({
    where: { questionId },
    orderBy: { sortOrder: "asc" },
    include: {
      translations: {
        where: { language: { code: { in: [...new Set([languageCode, "en"])] } } },
        include: { language: { select: { code: true } } },
      },
    },
  });
  return rows.map((option) => {
    const translation = pickTranslation(option.translations as OptionTranslationRow[], languageCode);
    return {
      id: option.id,
      key: option.key,
      text: translation?.text ?? option.key,
    };
  });
}

async function resolveTopicName(topicId: string, languageCode: string) {
  const translations = await prisma.topicTranslation.findMany({
    where: {
      topicId,
      language: { code: { in: [...new Set([languageCode, "en"])] } },
    },
    include: { language: { select: { code: true } } },
  });
  return (pickTranslation(translations as TopicTranslationRow[], languageCode)?.name) ?? null;
}

export async function serializeQuestion(
  questionId: string,
  userId: string,
  languageCode = "en",
) {
  const question = await prisma.question.findUniqueOrThrow({
    where: { id: questionId },
    include: {
      category: true,
      topic: true,
    },
  });
  const bookmark = await prisma.bookmark.findUnique({
    where: { userId_questionId: { userId, questionId } },
  });
  const translation = await resolveQuestionTranslation(questionId, languageCode);
  const topicName = await resolveTopicName(question.topicId, languageCode);
  const options = await resolveOptionTranslations(questionId, languageCode);
  return {
    id: question.id,
    externalId: question.externalId,
    type: question.type,
    difficulty: question.difficulty,
    imageUrl: question.imageUrl,
    videoUrl: question.videoUrl,
    category: { code: question.category.code, name: question.category.name },
    topic: {
      id: question.topic.id,
      slug: question.topic.slug,
      name: topicName ?? question.topic.slug,
    },
    text: translation?.text ?? "Translation unavailable",
    explanation: translation?.explanation ?? null,
    options,
    bookmarked: Boolean(bookmark),
  };
}

export async function gradeQuestion(questionId: string, selectedOptionIds: string[]) {
  const correct = await prisma.answerOption.findMany({
    where: { questionId, isCorrect: true },
    select: { id: true },
  });
  const expected = correct.map(({ id }) => id).sort();
  const selected = [...new Set(selectedOptionIds)].sort();
  return {
    isCorrect:
      expected.length === selected.length &&
      expected.every((id, index) => id === selected[index]),
    correctOptionIds: expected,
  };
}

export async function getAvailableQuestionIds(categoryCode: string, topicSlug?: string) {
  const where = {
    isActive: true,
    category: { code: categoryCode },
    ...(topicSlug ? { topic: { slug: topicSlug } } : {}),
  };
  return prisma.question.findMany({
    where,
    select: { id: true },
  });
}

export async function getTranslatedQuestionById(
  questionId: string,
  languageCode = "en",
) {
  const question = await prisma.question.findUniqueOrThrow({
    where: { id: questionId },
    include: {
      category: true,
      topic: true,
    },
  });
  const translation = await resolveQuestionTranslation(questionId, languageCode);
  const topicName = await resolveTopicName(question.topicId, languageCode);
  const options = await resolveOptionTranslations(questionId, languageCode);
  return {
    id: question.id,
    externalId: question.externalId,
    type: question.type,
    difficulty: question.difficulty,
    imageUrl: question.imageUrl,
    videoUrl: question.videoUrl,
    category: { code: question.category.code, name: question.category.name },
    topic: {
      id: question.topic.id,
      slug: question.topic.slug,
      name: topicName ?? question.topic.slug,
    },
    text: translation?.text ?? "Translation unavailable",
    explanation: translation?.explanation ?? null,
    options,
    bookmarked: false,
  };
}
