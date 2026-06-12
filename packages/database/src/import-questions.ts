import "./load-env.js";
import { readFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";
import { PrismaClient, QuestionType } from "@prisma/client";
import { z } from "zod";
import { languageCodes } from "@theorie-direkt/shared";

const prisma = new PrismaClient();
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const filePath = process.argv[2]
  ? resolve(process.cwd(), process.argv[2])
  : resolve(projectRoot, "import/questions.example.csv");

const rowSchema = z.object({
  externalId: z.string().min(1),
  category: z.string().min(1),
  topic: z.string().min(1),
  questionType: z.enum(["single_choice", "multiple_choice"]),
  difficulty: z.coerce.number().int().min(1).max(5),
  questionTextEn: z.string().min(1),
  explanationEn: z.string().default(""),
  answerAEn: z.string().min(1),
  answerBEn: z.string().min(1),
  answerCEn: z.string().default(""),
  answerDEn: z.string().default(""),
  correctAnswers: z.string().min(1),
  imageUrl: z.string().optional().default(""),
  videoUrl: z.string().optional().default(""),
}).passthrough();

type ImportRow = z.infer<typeof rowSchema>;

function readLocalized(row: ImportRow, prefix: string) {
  return languageCodes.flatMap((code) => {
    const suffix = code[0]!.toUpperCase() + code.slice(1);
    const value = row[`${prefix}${suffix}`];
    return typeof value === "string" && value.trim()
      ? [{ code, value: value.trim() }]
      : [];
  });
}

async function parseInput(): Promise<unknown[]> {
  const source = await readFile(filePath, "utf8");
  if (extname(filePath).toLowerCase() === ".json") {
    const data = JSON.parse(source);
    if (!Array.isArray(data)) throw new Error("JSON import must contain an array.");
    return data;
  }
  return parse(source, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });
}

async function importRow(raw: unknown) {
  const row = rowSchema.parse(raw);
  const category = await prisma.licenseCategory.findUnique({ where: { code: row.category } });
  const topic = await prisma.topic.findUnique({ where: { slug: row.topic } });
  if (!category) throw new Error(`Unknown category "${row.category}" for ${row.externalId}`);
  if (!topic) throw new Error(`Unknown topic "${row.topic}" for ${row.externalId}`);

  const question = await prisma.question.upsert({
    where: { externalId: row.externalId },
    update: {
      categoryId: category.id,
      topicId: topic.id,
      type: row.questionType === "single_choice"
        ? QuestionType.SINGLE_CHOICE
        : QuestionType.MULTIPLE_CHOICE,
      difficulty: row.difficulty,
      imageUrl: row.imageUrl || null,
      videoUrl: row.videoUrl || null,
      isActive: true,
    },
    create: {
      externalId: row.externalId,
      categoryId: category.id,
      topicId: topic.id,
      type: row.questionType === "single_choice"
        ? QuestionType.SINGLE_CHOICE
        : QuestionType.MULTIPLE_CHOICE,
      difficulty: row.difficulty,
      imageUrl: row.imageUrl || null,
      videoUrl: row.videoUrl || null,
    },
  });

  const questionTexts = new Map(readLocalized(row, "questionText").map((x) => [x.code, x.value]));
  const explanations = new Map(readLocalized(row, "explanation").map((x) => [x.code, x.value]));
  for (const [code, text] of questionTexts) {
    const language = await prisma.language.findUnique({ where: { code } });
    if (!language) continue;
    await prisma.questionTranslation.upsert({
      where: { questionId_languageId: { questionId: question.id, languageId: language.id } },
      update: { text, explanation: explanations.get(code) ?? null },
      create: {
        questionId: question.id,
        languageId: language.id,
        text,
        explanation: explanations.get(code) ?? null,
      },
    });
  }

  const correct = new Set(row.correctAnswers.split(/[|,;\s]+/).map((key) => key.toUpperCase()));
  for (const [index, key] of ["A", "B", "C", "D"].entries()) {
    const texts = readLocalized(row, `answer${key}`);
    if (!texts.length) continue;
    const option = await prisma.answerOption.upsert({
      where: { questionId_key: { questionId: question.id, key } },
      update: { isCorrect: correct.has(key), sortOrder: index },
      create: {
        questionId: question.id,
        key,
        isCorrect: correct.has(key),
        sortOrder: index,
      },
    });
    for (const { code, value } of texts) {
      const language = await prisma.language.findUnique({ where: { code } });
      if (!language) continue;
      await prisma.answerOptionTranslation.upsert({
        where: {
          answerOptionId_languageId: {
            answerOptionId: option.id,
            languageId: language.id,
          },
        },
        update: { text: value },
        create: { answerOptionId: option.id, languageId: language.id, text: value },
      });
    }
  }
}

async function main() {
  const rows = await parseInput();
  for (const row of rows) await importRow(row);
  console.log(`Imported ${rows.length} question(s) from ${filePath}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
