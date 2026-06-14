import { config } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(scriptDir, "../../../.env");
if (existsSync(envPath)) config({ path: envPath });

const prisma = new PrismaClient();
const catalogLanguageCodes = ["de", "en", "ru", "tr", "uz"];

async function main() {
  const [users, languages, categories, topics, questions, activeQuestions, translations, answerOptions, demoQuestions] =
    await Promise.all([
      prisma.user.count(),
      prisma.language.count(),
      prisma.licenseCategory.count(),
      prisma.topic.count(),
      prisma.question.count(),
      prisma.question.count({ where: { isActive: true } }),
      prisma.questionTranslation.count(),
      prisma.answerOption.count(),
      prisma.question.count({ where: { externalId: { startsWith: "demo-" } } }),
    ]);

  const [questionHealthRows, categoryRows, topicRows, translationRows, categoryTranslationRows, topicTranslationRows] = await Promise.all([
    prisma.$queryRaw`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE "isActive")::int AS active,
        COUNT(*) FILTER (WHERE "categoryId" IS NULL)::int AS without_category,
        COUNT(*) FILTER (WHERE "topicId" IS NULL)::int AS without_topic,
        COUNT(*) FILTER (
          WHERE NOT EXISTS (
            SELECT 1
            FROM "AnswerOption" ao
            WHERE ao."questionId" = q."id"
          )
        )::int AS without_answers
      FROM "Question" q
    `,
    prisma.$queryRaw`
      SELECT
        q."categoryId" AS "categoryId",
        lc."code" AS "categoryCode",
        COUNT(*)::int AS count
      FROM "Question" q
      LEFT JOIN "LicenseCategory" lc ON lc."id" = q."categoryId"
      GROUP BY q."categoryId", lc."code", lc."sortOrder"
      ORDER BY lc."sortOrder" NULLS LAST, lc."code" NULLS LAST
    `,
    prisma.$queryRaw`
      SELECT
        q."topicId" AS "topicId",
        COALESCE(tt."name", t."slug", 'uncategorized') AS "topicName",
        COUNT(*)::int AS count
      FROM "Question" q
      LEFT JOIN "Topic" t ON t."id" = q."topicId"
      LEFT JOIN "TopicTranslation" tt ON tt."topicId" = t."id"
        AND tt."languageId" = (
          SELECT l."id"
          FROM "Language" l
          WHERE l."code" = 'en'
          LIMIT 1
        )
      GROUP BY q."topicId", tt."name", t."slug", t."sortOrder"
      ORDER BY t."sortOrder" NULLS LAST, tt."name" NULLS LAST, t."slug" NULLS LAST
    `,
    prisma.$queryRaw`
      SELECT
        l."code" AS "languageCode",
        COUNT(*)::int AS count
      FROM "QuestionTranslation" qt
      JOIN "Language" l ON l."id" = qt."languageId"
      GROUP BY l."code"
      ORDER BY l."code"
    `,
    prisma.$queryRaw`
      SELECT
        l."code" AS "languageCode",
        COUNT(*)::int AS count
      FROM "LicenseCategoryTranslation" ct
      JOIN "Language" l ON l."id" = ct."languageId"
      GROUP BY l."code"
      ORDER BY l."code"
    `,
    prisma.$queryRaw`
      SELECT
        l."code" AS "languageCode",
        COUNT(*)::int AS count
      FROM "TopicTranslation" tt
      JOIN "Language" l ON l."id" = tt."languageId"
      GROUP BY l."code"
      ORDER BY l."code"
    `,
  ]);

  const emptyTopics = await prisma.$queryRaw`
    SELECT
      t."slug" AS "slug",
      COALESCE(en_tt."name", t."slug") AS "englishName",
      COUNT(q."id")::int AS "questionCount"
    FROM "Topic" t
    LEFT JOIN "Question" q ON q."topicId" = t."id"
    LEFT JOIN "TopicTranslation" en_tt ON en_tt."topicId" = t."id"
      AND en_tt."languageId" = (
        SELECT l."id"
        FROM "Language" l
        WHERE l."code" = 'en'
        LIMIT 1
      )
    GROUP BY t."id", t."slug", en_tt."name"
    HAVING COUNT(q."id") = 0
    ORDER BY t."sortOrder" ASC, t."slug" ASC
  `;

  const questionHealth = questionHealthRows[0] ?? {
    total: 0,
    active: 0,
    without_category: 0,
    without_topic: 0,
    without_answers: 0,
  };
  const questionsByCategory = Object.fromEntries(
    categoryRows.map((row) => [
      row.categoryCode ?? (row.categoryId ?? "uncategorized"),
      row.count,
    ]),
  );
  const uncategorizedQuestions = categoryRows
    .filter((row) => row.categoryCode === null || row.categoryId === null)
    .reduce((sum, row) => sum + row.count, 0);
  const questionsByTopic = Object.fromEntries(
    topicRows.map((row) => [row.topicName, row.count]),
  );
  const translationsByLanguage = Object.fromEntries(
    translationRows.map((row) => [row.languageCode, row.count]),
  );
  const categoryTranslationsByLanguage = Object.fromEntries(
    categoryTranslationRows.map((row) => [row.languageCode, row.count]),
  );
  const topicTranslationsByLanguage = Object.fromEntries(
    topicTranslationRows.map((row) => [row.languageCode, row.count]),
  );
  const missingCategoryTranslations = Object.fromEntries(
    catalogLanguageCodes.map((code) => [code, categories - (categoryTranslationsByLanguage[code] ?? 0)]),
  );
  const missingTopicTranslations = Object.fromEntries(
    catalogLanguageCodes.map((code) => [code, topics - (topicTranslationsByLanguage[code] ?? 0)]),
  );

  if (questionHealth.without_category > 0) {
    console.warn(`[warn] ${questionHealth.without_category} question(s) are missing categoryId.`);
  }
  if (questionHealth.without_topic > 0) {
    console.warn(`[warn] ${questionHealth.without_topic} question(s) are missing topicId.`);
  }
  if (questionHealth.without_answers > 0) {
    console.warn(`[warn] ${questionHealth.without_answers} question(s) have no answer options.`);
  }

  console.log(JSON.stringify({
    users,
    languages,
    categories,
    topics,
    questions,
    activeQuestions,
    translations,
    answerOptions,
    demoQuestions,
    questionsByCategory,
    questionsByTopic,
    uncategorizedQuestions,
    translationsByLanguage,
    categoryTranslationsByLanguage,
    topicTranslationsByLanguage,
    missingCategoryTranslations,
    missingTopicTranslations,
    emptyTopics,
    questionHealth: {
      total: questionHealth.total,
      active: questionHealth.active,
      withoutCategory: questionHealth.without_category,
      withoutTopic: questionHealth.without_topic,
      withoutAnswers: questionHealth.without_answers,
    },
  }, null, 2));
}

main()
  .catch((error) => {
    if (String(error?.message ?? "").includes("Can't reach database server")) {
      console.error("Database unavailable at localhost:5432. Start PostgreSQL and rerun npm run db:inspect.");
      process.exitCode = 1;
      return;
    }
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
