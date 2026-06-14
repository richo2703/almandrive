import "./load-env.js";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import {
  normalizeCell,
  translationTargetLanguages,
} from "./translation-workflow.js";
import { databaseLanguageDefinitions } from "./language-definitions.js";

const prisma = new PrismaClient();
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const translationsDir = resolve(projectRoot, "import/translations");

const importRowSchema = z.object({
  questionExternalId: z.string().min(1),
  sourceLanguage: z.string().min(1),
  targetLanguage: z.enum(translationTargetLanguages),
  questionTextSource: z.string().optional().default(""),
  explanationSource: z.string().optional().default(""),
  answerASource: z.string().optional().default(""),
  answerBSource: z.string().optional().default(""),
  answerCSource: z.string().optional().default(""),
  answerDSource: z.string().optional().default(""),
  questionTextTarget: z.string().optional().default(""),
  explanationTarget: z.string().optional().default(""),
  answerATarget: z.string().optional().default(""),
  answerBTarget: z.string().optional().default(""),
  answerCTarget: z.string().optional().default(""),
  answerDTarget: z.string().optional().default(""),
}).passthrough();

async function parseFile(filePath: string) {
  const source = await readFile(filePath, "utf8");
  return parse(source, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });
}

function rowToOptionMap(question: {
  answerOptions: Array<{ id: string; key: string }>;
}) {
  return new Map(question.answerOptions.map((option) => [option.key, option]));
}

async function ensureLanguage(code: string) {
  const existing = await prisma.language.findUnique({ where: { code } });
  if (existing) return existing;
  const definition = databaseLanguageDefinitions.find((language) => language.code === code);
  if (!definition) return null;
  return prisma.language.create({
    data: {
      code: definition.code,
      name: definition.name,
      nativeName: definition.nativeName,
      isRtl: definition.isRtl,
      isInterfaceActive: true,
      isContentActive: definition.isContentActive,
    },
  });
}

async function importRow(raw: unknown) {
  const row = importRowSchema.parse(raw);
  const question = await prisma.question.findUnique({
    where: { externalId: row.questionExternalId },
    select: {
      id: true,
      externalId: true,
      answerOptions: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, key: true },
      },
    },
  });
  if (!question) {
    console.warn(`[warn] question not found: ${row.questionExternalId}`);
    return { importedQuestion: false, importedOptions: 0 };
  }

  const targetLanguage = await ensureLanguage(row.targetLanguage);
  if (!targetLanguage) {
    console.warn(`[warn] language not found: ${row.targetLanguage} for ${row.questionExternalId}`);
    return { importedQuestion: false, importedOptions: 0 };
  }

  const questionTextTarget = normalizeCell(row.questionTextTarget);
  if (!questionTextTarget) {
    console.warn(`[warn] ${row.questionExternalId}: missing target question text`);
    return { importedQuestion: false, importedOptions: 0 };
  }

  const optionMap = rowToOptionMap(question);
  for (const key of ["A", "B", "C", "D"] as const) {
    if (!optionMap.has(key)) {
      console.warn(`[warn] ${row.questionExternalId}: missing answer option ${key}`);
    }
  }

  await prisma.questionTranslation.upsert({
    where: {
      questionId_languageId: {
        questionId: question.id,
        languageId: targetLanguage.id,
      },
    },
    update: {
      text: questionTextTarget,
      explanation: normalizeCell(row.explanationTarget) || null,
    },
    create: {
      questionId: question.id,
      languageId: targetLanguage.id,
      text: questionTextTarget,
      explanation: normalizeCell(row.explanationTarget) || null,
    },
  });

  let importedOptions = 0;
  const targetAnswers: Record<"A" | "B" | "C" | "D", string> = {
    A: normalizeCell(row.answerATarget),
    B: normalizeCell(row.answerBTarget),
    C: normalizeCell(row.answerCTarget),
    D: normalizeCell(row.answerDTarget),
  };
  for (const key of ["A", "B", "C", "D"] as const) {
    const targetText = targetAnswers[key];
    if (!targetText) {
      console.warn(`[warn] ${row.questionExternalId}: missing target answer ${key}`);
      continue;
    }
    const option = optionMap.get(key);
    if (!option) {
      continue;
    }
    await prisma.answerOptionTranslation.upsert({
      where: {
        answerOptionId_languageId: {
          answerOptionId: option.id,
          languageId: targetLanguage.id,
        },
      },
      update: { text: targetText },
      create: {
        answerOptionId: option.id,
        languageId: targetLanguage.id,
        text: targetText,
      },
    });
    importedOptions += 1;
  }

  return { importedQuestion: true, importedOptions };
}

async function main() {
  let processedRows = 0;
  let importedQuestions = 0;
  let importedOptions = 0;

  for (const targetLanguage of translationTargetLanguages) {
    const filePath = resolve(translationsDir, `completed-${targetLanguage}.csv`);
    if (!existsSync(filePath)) {
      console.warn(`[warn] missing file: ${filePath}`);
      continue;
    }
    const rows = await parseFile(filePath);
    for (const raw of rows) {
      processedRows += 1;
      const result = await importRow(raw);
      if (result.importedQuestion) importedQuestions += 1;
      importedOptions += result.importedOptions;
    }
  }

  console.log(`Processed ${processedRows} translation row(s).`);
  console.log(`Imported/updated ${importedQuestions} question translation(s).`);
  console.log(`Imported/updated ${importedOptions} answer option translation(s).`);
}

main()
  .catch((error) => {
    if (String(error?.message ?? "").includes("Can't reach database server")) {
      console.error("Database unavailable at localhost:5432. Start PostgreSQL and rerun npm run translations:import.");
      process.exitCode = 1;
      return;
    }
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
