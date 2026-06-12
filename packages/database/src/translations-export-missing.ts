import "./load-env.js";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import {
  pickOptionSourceTranslation,
  pickQuestionSourceTranslation,
  serializeCsv,
  translationTargetLanguages,
  type TranslationCsvRow,
} from "./translation-workflow.js";

const prisma = new PrismaClient();
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const translationsDir = resolve(projectRoot, "import/translations");

function buildEmptyRow(
  question: {
    externalId: string;
    translations: Array<{ language: { code: string }; text: string; explanation: string | null }>;
    answerOptions: Array<{
      key: string;
      translations: Array<{ language: { code: string }; text: string }>;
    }>;
  },
  targetLanguage: string,
): TranslationCsvRow | null {
  if (question.translations.some((translation) => translation.language.code === targetLanguage)) {
    return null;
  }
  const sourceTranslation = pickQuestionSourceTranslation(question.translations);
  if (!sourceTranslation) {
    console.warn(`[warn] ${question.externalId}: missing source translation for ${targetLanguage}`);
    return null;
  }

  const optionMap = new Map(question.answerOptions.map((option) => [option.key, option]));
  const getSourceOptionText = (key: string) =>
    pickOptionSourceTranslation(optionMap.get(key)?.translations ?? [])?.text ?? "";

  return {
    questionExternalId: question.externalId,
    sourceLanguage: sourceTranslation.language.code,
    targetLanguage,
    questionTextSource: sourceTranslation.text,
    explanationSource: sourceTranslation.explanation ?? "",
    answerASource: getSourceOptionText("A"),
    answerBSource: getSourceOptionText("B"),
    answerCSource: getSourceOptionText("C"),
    answerDSource: getSourceOptionText("D"),
    questionTextTarget: "",
    explanationTarget: "",
    answerATarget: "",
    answerBTarget: "",
    answerCTarget: "",
    answerDTarget: "",
  };
}

async function main() {
  await mkdir(translationsDir, { recursive: true });
  const questions = await prisma.question.findMany({
    orderBy: { externalId: "asc" },
    select: {
      externalId: true,
      translations: {
        select: {
          text: true,
          explanation: true,
          language: { select: { code: true } },
        },
      },
      answerOptions: {
        orderBy: { sortOrder: "asc" },
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

  for (const targetLanguage of translationTargetLanguages) {
    const rows = questions
      .map((question) => buildEmptyRow(question, targetLanguage))
      .filter((row): row is TranslationCsvRow => Boolean(row));
    const filePath = resolve(translationsDir, `missing-${targetLanguage}.csv`);
    await writeFile(filePath, `${serializeCsv(rows)}\n`, "utf8");
    console.log(`Wrote ${rows.length} missing translation row(s) to ${filePath}`);
  }
}

main()
  .catch((error) => {
    if (String(error?.message ?? "").includes("Can't reach database server")) {
      console.error("Database unavailable at localhost:5432. Start PostgreSQL and rerun npm run translations:export-missing.");
      process.exitCode = 1;
      return;
    }
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
