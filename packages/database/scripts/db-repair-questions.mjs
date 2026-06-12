import { config } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(scriptDir, "../../../.env");
if (existsSync(envPath)) config({ path: envPath });

const prisma = new PrismaClient();

const categoryCodes = [
  "BF17", "B197", "B96", "D1E", "C1E", "DE", "CE", "C1", "D1",
  "AM", "A1", "A2", "BE", "A", "B", "C", "D", "L", "T",
];

function inferCategoryCodeFromExternalId(externalId) {
  const upper = String(externalId ?? "").toUpperCase();
  const code = categoryCodes.find((candidate) =>
    new RegExp(`(?:^|[^A-Z0-9])${candidate}(?:$|[^A-Z0-9])`).test(upper)
  );
  return code ?? null;
}

async function main() {
  const english = await prisma.language.findUnique({ where: { code: "en" } });
  if (!english) throw new Error("English language row not found.");
  const fallbackCategory = await prisma.licenseCategory.findUnique({ where: { code: "B" } });
  if (!fallbackCategory) throw new Error('License category "B" not found.');

  const questions = await prisma.question.findMany({
    select: {
      id: true,
      externalId: true,
      categoryId: true,
      topicId: true,
      isActive: true,
      translations: {
        select: {
          id: true,
          text: true,
          explanation: true,
          language: { select: { code: true } },
        },
      },
      answerOptions: {
        select: {
          id: true,
          translations: {
            select: {
              id: true,
              text: true,
              language: { select: { code: true } },
            },
          },
        },
      },
    },
  });

  let activated = 0;
  let copiedQuestionTranslations = 0;
  let copiedOptionTranslations = 0;

  for (const question of questions) {
    const sourceCategoryCode = inferCategoryCodeFromExternalId(question.externalId);
    if (!question.categoryId) {
      console.warn(
        `[warn] ${question.externalId}: missing category${sourceCategoryCode ? `, inferring ${sourceCategoryCode}` : ""}`,
      );
      const inferredCategory = sourceCategoryCode
        ? await prisma.licenseCategory.findUnique({ where: { code: sourceCategoryCode } })
        : null;
      await prisma.question.update({
        where: { id: question.id },
        data: { categoryId: inferredCategory?.id ?? fallbackCategory.id },
      });
    }
    if (!question.answerOptions.length) {
      console.warn(`[warn] ${question.externalId}: missing answer options`);
    }

    const hasTranslatableShape = question.translations.length > 0 && question.answerOptions.length > 0;
    if (hasTranslatableShape && !question.isActive) {
      await prisma.question.update({
        where: { id: question.id },
        data: { isActive: true },
      });
      activated += 1;
    }

    const englishQuestion = question.translations.find((translation) => translation.language.code === "en");
    if (!englishQuestion && question.translations.length > 0) {
      const source = question.translations[0];
      await prisma.questionTranslation.upsert({
        where: {
          questionId_languageId: {
            questionId: question.id,
            languageId: english.id,
          },
        },
        update: {
          text: source.text,
          explanation: source.explanation,
        },
        create: {
          questionId: question.id,
          languageId: english.id,
          text: source.text,
          explanation: source.explanation,
        },
      });
      copiedQuestionTranslations += 1;
    }

    for (const option of question.answerOptions) {
      const englishOption = option.translations.find((translation) => translation.language.code === "en");
      if (!englishOption && option.translations.length > 0) {
        const source = option.translations[0];
        await prisma.answerOptionTranslation.upsert({
          where: {
            answerOptionId_languageId: {
              answerOptionId: option.id,
              languageId: english.id,
            },
          },
          update: { text: source.text },
          create: {
            answerOptionId: option.id,
            languageId: english.id,
            text: source.text,
          },
        });
        copiedOptionTranslations += 1;
      }
    }
  }

  console.log(`Activated ${activated} question(s).`);
  console.log(`Copied ${copiedQuestionTranslations} question translation(s) to English.`);
  console.log(`Copied ${copiedOptionTranslations} answer option translation(s) to English.`);
  console.log("No records were deleted.");
}

main()
  .catch((error) => {
    if (String(error?.message ?? "").includes("Can't reach database server")) {
      console.error("Database unavailable at localhost:5432. Start PostgreSQL and rerun npm run db:repair-questions.");
      process.exitCode = 1;
      return;
    }
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
