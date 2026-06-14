import "./load-env.js";
import { PrismaClient } from "@prisma/client";
import { classifyTopic, topicDefinitions } from "./topic-classification.js";
import {
  catalogLanguageCodes,
  getLocalizedGenericTopicName,
} from "./catalog-localization.js";

const prisma = new PrismaClient();

async function ensureTopics() {
  const languages = await Promise.all(
    catalogLanguageCodes.map((code) => prisma.language.findUniqueOrThrow({ where: { code } })),
  );
  const languageIds = new Map(languages.map((language) => [language.code, language.id]));
  for (const [index, topic] of topicDefinitions.entries()) {
    const record = await prisma.topic.upsert({
      where: { slug: topic.slug },
      update: { sortOrder: index, isActive: true },
      create: { slug: topic.slug, sortOrder: index, isActive: true },
    });
    const localizedNames = {
      en: getLocalizedGenericTopicName(topic.slug, "en"),
      de: getLocalizedGenericTopicName(topic.slug, "de"),
      ru: getLocalizedGenericTopicName(topic.slug, "ru"),
      tr: getLocalizedGenericTopicName(topic.slug, "tr"),
      uz: getLocalizedGenericTopicName(topic.slug, "uz"),
    };
    for (const [languageCode, name] of Object.entries(localizedNames) as Array<
      [typeof catalogLanguageCodes[number], string]
    >) {
      const languageId = languageIds.get(languageCode);
      if (!languageId) continue;
      await prisma.topicTranslation.upsert({
        where: { topicId_languageId: { topicId: record.id, languageId } },
        update: { name },
        create: { topicId: record.id, languageId, name },
      });
    }
  }
}

function buildCorpus(question: {
  externalId: string;
  category: { code: string } | null;
  translations: Array<{ text: string; explanation: string | null; language: { code: string } }>;
  answerOptions: Array<{
    key: string;
    translations: Array<{ text: string; language: { code: string } }>;
  }>;
}) {
  return [
    question.externalId,
    question.category?.code ?? "",
    ...question.translations.map((translation) => `${translation.language.code} ${translation.text} ${translation.explanation ?? ""}`),
    ...question.answerOptions.flatMap((option) => [
      option.key,
      ...option.translations.map((translation) => `${translation.language.code} ${translation.text}`),
    ]),
  ]
    .join(" ")
    .trim();
}

async function main() {
  await ensureTopics();
  const questions = await prisma.question.findMany({
    select: {
      id: true,
      externalId: true,
      category: { select: { code: true } },
      topic: { select: { slug: true } },
      translations: {
        select: {
          text: true,
          explanation: true,
          language: { select: { code: true } },
        },
      },
      answerOptions: {
        select: {
          key: true,
          translations: {
            select: {
              text: true,
              language: { select: { code: true } },
            },
          },
        },
      },
    },
  });

  const topicBySlug = new Map(
    (await prisma.topic.findMany({ select: { id: true, slug: true } })).map((row) => [row.slug, row.id]),
  );

  const counts = new Map<string, number>();
  let changed = 0;

  for (const question of questions) {
    const corpus = buildCorpus(question);
    const targetSlug = classifyTopic(corpus, question.category?.code).slug;
    counts.set(targetSlug, (counts.get(targetSlug) ?? 0) + 1);

    const topicId = topicBySlug.get(targetSlug);
    if (!topicId) {
      console.warn(`[warn] missing topic row for ${targetSlug}; skipping ${question.externalId}`);
      continue;
    }

    if (question.topic?.slug !== targetSlug) {
      await prisma.question.update({
        where: { id: question.id },
        data: { topicId },
      });
      changed += 1;
    }
  }

  console.log(`Classified ${questions.length} question(s).`);
  console.log(`Updated ${changed} question(s).`);
  console.log(
    JSON.stringify(
      Object.fromEntries(
        [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)),
      ),
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    if (String(error?.message ?? "").includes("Can't reach database server")) {
      console.error("Database unavailable at localhost:5432. Start PostgreSQL and rerun npm run questions:auto-topics.");
      process.exitCode = 1;
      return;
    }
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
