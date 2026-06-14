import "./load-env.js";
import { PrismaClient } from "@prisma/client";
import {
  catalogLanguageCodes,
  getLocalizedCategoryName,
  getLocalizedGenericTopicName,
  localizedGenericTopicNames,
  localizedImportedTopicNames,
} from "./catalog-localization.js";

const prisma = new PrismaClient();

async function ensureLanguageIds() {
  const languages = await prisma.language.findMany({
    where: { code: { in: [...catalogLanguageCodes] } },
    select: { code: true, id: true },
  });
  const ids = Object.fromEntries(languages.map((language) => [language.code, language.id]));
  for (const code of catalogLanguageCodes) {
    if (!ids[code]) throw new Error(`Missing language row for ${code}. Run npm run seed first.`);
  }
  return ids as Record<(typeof catalogLanguageCodes)[number], string>;
}

async function syncCategories(languageIds: Record<(typeof catalogLanguageCodes)[number], string>) {
  const categories = await prisma.licenseCategory.findMany({ select: { id: true, code: true } });
  for (const category of categories) {
    for (const code of catalogLanguageCodes) {
      await prisma.licenseCategoryTranslation.upsert({
        where: {
          categoryId_languageId: {
            categoryId: category.id,
            languageId: languageIds[code],
          },
        },
        update: { name: getLocalizedCategoryName(category.code, code) },
        create: {
          categoryId: category.id,
          languageId: languageIds[code],
          name: getLocalizedCategoryName(category.code, code),
        },
      });
    }
  }
  return categories.length;
}

async function syncTopics(languageIds: Record<(typeof catalogLanguageCodes)[number], string>) {
  const topics = await prisma.topic.findMany({
    select: {
      id: true,
      slug: true,
      translations: {
        where: { language: { code: { in: ["en", "de"] } } },
        include: { language: { select: { code: true } } },
      },
    },
  });

  for (const topic of topics) {
    const english = topic.translations.find((translation) => translation.language.code === "en")?.name ?? topic.slug;
    const german = topic.translations.find((translation) => translation.language.code === "de")?.name ?? null;
    const names = topic.slug in localizedGenericTopicNames ? {
      en: getLocalizedGenericTopicName(topic.slug, "en"),
      de: getLocalizedGenericTopicName(topic.slug, "de"),
      ru: getLocalizedGenericTopicName(topic.slug, "ru"),
      tr: getLocalizedGenericTopicName(topic.slug, "tr"),
      uz: getLocalizedGenericTopicName(topic.slug, "uz"),
    } : localizedImportedTopicNames(english, german);
    for (const code of catalogLanguageCodes) {
      await prisma.topicTranslation.upsert({
        where: {
          topicId_languageId: {
            topicId: topic.id,
            languageId: languageIds[code],
          },
        },
        update: { name: names[code] },
        create: {
          topicId: topic.id,
          languageId: languageIds[code],
          name: names[code],
        },
      });
    }
  }
  return topics.length;
}

async function main() {
  const languageIds = await ensureLanguageIds();
  const categories = await syncCategories(languageIds);
  const topics = await syncTopics(languageIds);
  console.log(`Synchronized ${categories} categor(y/ies) and ${topics} topic(s).`);
}

main()
  .catch((error) => {
    if (String(error?.message ?? "").includes("Can't reach database server")) {
      console.error("Database unavailable at localhost:5432. Start PostgreSQL and rerun npm run catalog:sync-localizations.");
      process.exitCode = 1;
      return;
    }
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
