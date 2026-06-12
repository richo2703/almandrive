import "./load-env.js";
import {
  copyFile,
  mkdir,
  readFile,
  stat,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";
import { PrismaClient, QuestionType } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const extractedRoot = resolve(
  projectRoot,
  process.env.MY_BASE_DIR ?? "import/my-base/driving-theory-main",
);
const publicImages = resolve(projectRoot, "apps/web/public/media/images");
const publicVideos = resolve(projectRoot, "apps/web/public/media/videos");

const optionSchema = z.object({
  letter: z.union([z.string(), z.number()]).transform(String),
  text: z.string().optional().default(""),
});

const sourceRowSchema = z.object({
  theme_number: z.string().optional().default(""),
  theme_name: z.string().optional().default(""),
  chapter_number: z.string().optional().default(""),
  chapter_name: z.string().optional().default(""),
  question_id: z.string().optional().default(""),
  question_number: z.string().optional().default(""),
  points: z.union([z.string(), z.number()]).optional().default("3"),
  question_text: z.string().optional().default(""),
  options: z.union([z.array(optionSchema), z.string()]).optional().default([]),
  correct_answers: z.union([z.array(optionSchema), z.string()]).optional().default([]),
  comment: z.string().optional().default(""),
  image_paths: z.string().optional().default(""),
  video_paths: z.string().optional().default(""),
  local_image_paths: z.array(z.string()).optional().default([]),
  local_video_paths: z.array(z.string()).optional().default([]),
  category: z.union([z.string(), z.array(z.string())]).optional(),
  license_category: z.union([z.string(), z.array(z.string())]).optional(),
  license_categories: z.union([z.string(), z.array(z.string())]).optional(),
}).passthrough();

type SourceRow = z.infer<typeof sourceRowSchema>;
type NormalizedOption = { key: string; text: string };
type NormalizedRow = {
  externalId: string;
  sourceFile: string;
  rowNumber: number;
  questionText: string;
  explanation: string | null;
  options: NormalizedOption[];
  correctKeys: string[];
  points: number;
  categoryCode: string;
  topicSlug: string;
  topicName: string;
  imagePath: string | null;
  videoPath: string | null;
};

const categoryNames: Record<string, string> = {
  AM: "Mopeds and light quadricycles",
  A1: "Light motorcycles",
  A2: "Medium motorcycles",
  A: "Motorcycles",
  B: "Passenger cars",
  BF17: "Accompanied driving from 17",
  B197: "Category B with automatic test",
  B96: "Car and trailer combination",
  BE: "Passenger car with trailer",
  C1: "Medium goods vehicles",
  C1E: "Medium goods vehicle combinations",
  C: "Heavy goods vehicles",
  CE: "Heavy goods vehicle combinations",
  D1: "Minibuses",
  D1E: "Minibus combinations",
  D: "Buses",
  DE: "Bus combinations",
  L: "Agricultural tractors",
  T: "High-speed agricultural tractors",
};

const warnings = new Map<string, number>();

function warn(message: string) {
  warnings.set(message, (warnings.get(message) ?? 0) + 1);
}

function cleanKey(value: string) {
  return value.trim().replace(/[.:)]/g, "").toUpperCase();
}

function parseDelimitedOptions(value: string): NormalizedOption[] {
  if (!value.trim()) return [];
  return value
    .split(/\s*;\s*/)
    .map((part, index) => {
      const match = part.match(/^([A-Z0-9,.]+)\.\s*(.*)$/i);
      return {
        key: cleanKey(match?.[1] ?? String.fromCharCode(65 + index)),
        text: (match?.[2] ?? part).trim(),
      };
    })
    .filter((option) => option.text);
}

function normalizeOptions(value: SourceRow["options"]): NormalizedOption[] {
  if (typeof value === "string") return parseDelimitedOptions(value);
  return value
    .map((option, index) => ({
      key: cleanKey(option.letter || String.fromCharCode(65 + index)),
      text: option.text.trim(),
    }))
    .filter((option) => option.text);
}

function normalizeCorrectKeys(value: SourceRow["correct_answers"]) {
  if (typeof value === "string") {
    return parseDelimitedOptions(value).map((option) => option.key);
  }
  return value.map((option) => cleanKey(option.letter)).filter(Boolean);
}

function normalizeMediaPaths(paths: string[], csvValue: string) {
  const values = paths.length
    ? paths
    : csvValue.split(/\s*;\s*/).map((value) => value.trim()).filter(Boolean);
  return values.map((value) => value.replaceAll("\\", "/"));
}

function slugifyTopic(chapterNumber: string, chapterName: string) {
  const number = chapterNumber.replace(/[^\d.]/g, "").replace(/\.$/, "");
  if (number) return `source-${number.replaceAll(".", "-")}`;
  const name = chapterName
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return `source-${name || "uncategorized"}`;
}

function normalizeCategory(value: unknown) {
  const first = Array.isArray(value) ? value[0] : value;
  if (typeof first !== "string") return null;
  const code = first.trim().toUpperCase().replace(/^CLASS\s+/, "");
  return categoryNames[code] ? code : null;
}

function inferCategory(row: SourceRow) {
  const explicit =
    normalizeCategory(row.category) ??
    normalizeCategory(row.license_category) ??
    normalizeCategory(row.license_categories);
  if (explicit) return explicit;

  const searchable = `${row.question_text} ${row.chapter_name}`.toUpperCase();
  const mentioned = [
    "D1E", "C1E", "BF17", "B197", "B96", "AM", "A1", "A2",
    "BE", "CE", "C1", "DE", "D1", "A", "B", "C", "D", "L", "T",
  ].find((code) => new RegExp(`\\b(?:CLASS|CATEGORY)\\s+${code}\\b`).test(searchable));
  if (mentioned && categoryNames[mentioned]) return mentioned;

  const sourceId = row.question_id || row.question_number;
  const serial = Number(sourceId.match(/-(\d{3})(?:-[A-Z])?$/)?.[1]);
  if (Number.isFinite(serial)) {
    if (serial >= 400) return "T";
    if (serial >= 300) return "D";
    if (serial >= 200) {
      if (/TRAILER|COUPLING|COMBINATION/.test(searchable)) return "CE";
      return "C";
    }
    if (serial >= 100) return "B";
    if (/MOPED|MOTORCYCLE|TWO-WHEELER|MOTORBIKE/.test(searchable)) return "A";
  }

  warn("Source has no explicit license category; category B fallback was used");
  return "B";
}

function parsePoints(value: SourceRow["points"]) {
  const points = Number(String(value).match(/\d+/)?.[0] ?? 3);
  return Math.min(5, Math.max(1, points));
}

function normalizeRow(
  raw: unknown,
  sourceFile: string,
  rowNumber: number,
): NormalizedRow | null {
  const result = sourceRowSchema.safeParse(raw);
  if (!result.success) {
    warn(`Invalid record shape in ${sourceFile}`);
    return null;
  }
  const row = result.data;
  const externalId =
    row.question_id.trim() ||
    row.question_number.trim() ||
    `my-base:${basename(sourceFile, extname(sourceFile))}:${rowNumber}`;
  const options = normalizeOptions(row.options);
  const correctKeys = normalizeCorrectKeys(row.correct_answers);

  if (!row.question_text.trim()) {
    warn(`Missing question text`);
    return null;
  }
  if (options.length < 2) {
    warn(`Unsupported free-response or missing answer options`);
    return null;
  }
  if (!correctKeys.length) {
    warn(`Missing correct answers`);
    return null;
  }
  if (correctKeys.some((key) => !options.some((option) => option.key === key))) {
    warn(`Correct answer does not match an option`);
    return null;
  }

  const images = normalizeMediaPaths(row.local_image_paths, row.image_paths);
  const videos = normalizeMediaPaths(row.local_video_paths, row.video_paths);
  return {
    externalId,
    sourceFile,
    rowNumber,
    questionText: row.question_text.trim(),
    explanation: row.comment.trim() || null,
    options,
    correctKeys,
    points: parsePoints(row.points),
    categoryCode: inferCategory(row),
    topicSlug: slugifyTopic(row.chapter_number, row.chapter_name),
    topicName: row.chapter_name.trim() || row.theme_name.trim() || "Uncategorized",
    imagePath: images[0] ?? null,
    videoPath: videos[0] ?? null,
  };
}

async function loadRows(filePath: string) {
  const source = await readFile(filePath, "utf8");
  if (extname(filePath).toLowerCase() === ".json") {
    const data = JSON.parse(source);
    if (!Array.isArray(data)) throw new Error(`${filePath} must contain a JSON array.`);
    return data;
  }
  return parse(source, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  }) as unknown[];
}

function findSourceFile(languageSuffix: "" | "_de") {
  const jsonPath = resolve(extractedRoot, `driving_theory_questions${languageSuffix}.json`);
  if (existsSync(jsonPath)) return jsonPath;
  const csvPath = resolve(extractedRoot, `driving_theory_questions${languageSuffix}.csv`);
  if (existsSync(csvPath)) return csvPath;
  return null;
}

async function getOrCreateCategory(code: string) {
  const existing = await prisma.licenseCategory.findUnique({ where: { code } });
  if (existing) return existing;
  const last = await prisma.licenseCategory.aggregate({ _max: { sortOrder: true } });
  return prisma.licenseCategory.create({
    data: {
      code,
      name: categoryNames[code] ?? code,
      description: categoryNames[code] ?? null,
      sortOrder: (last._max.sortOrder ?? 0) + 1,
    },
  });
}

async function getOrCreateTopic(
  slug: string,
  names: Partial<Record<"en" | "de", string>>,
  languageIds: Record<"en" | "de", string>,
) {
  const topic = await prisma.topic.upsert({
    where: { slug },
    update: { isActive: true },
    create: { slug, sortOrder: 100 },
  });
  for (const code of ["en", "de"] as const) {
    const name = names[code];
    if (!name) continue;
    await prisma.topicTranslation.upsert({
      where: {
        topicId_languageId: {
          topicId: topic.id,
          languageId: languageIds[code],
        },
      },
      update: { name },
      create: { topicId: topic.id, languageId: languageIds[code], name },
    });
  }
  return topic;
}

function browserMediaUrl(sourcePath: string | null, type: "images" | "videos") {
  if (!sourcePath) return null;
  const sourceFile = resolve(extractedRoot, sourcePath);
  if (!existsSync(sourceFile)) {
    warn(`Missing referenced ${type.slice(0, -1)} file`);
    return null;
  }
  return `/media/${type}/${basename(sourcePath)}`;
}

async function copyMediaDirectory(type: "images" | "videos") {
  const sourceDirectory = resolve(extractedRoot, type);
  const destinationDirectory = type === "images" ? publicImages : publicVideos;
  if (!existsSync(sourceDirectory)) {
    warn(`Missing ${type} directory`);
    return 0;
  }
  await mkdir(destinationDirectory, { recursive: true });
  const { readdir } = await import("node:fs/promises");
  const files = await readdir(sourceDirectory, { withFileTypes: true });
  let copied = 0;
  for (const file of files) {
    if (!file.isFile()) continue;
    const source = resolve(sourceDirectory, file.name);
    const destination = resolve(destinationDirectory, file.name);
    if (existsSync(destination)) {
      const [sourceStat, destinationStat] = await Promise.all([stat(source), stat(destination)]);
      if (sourceStat.size === destinationStat.size) continue;
    }
    await copyFile(source, destination);
    copied += 1;
  }
  return copied;
}

async function importQuestion(
  english: NormalizedRow,
  german: NormalizedRow | undefined,
  languageIds: Record<"en" | "de", string>,
) {
  const category = await getOrCreateCategory(english.categoryCode);
  const topic = await getOrCreateTopic(
    english.topicSlug,
    { en: english.topicName, de: german?.topicName },
    languageIds,
  );
  const type =
    english.correctKeys.length === 1
      ? QuestionType.SINGLE_CHOICE
      : QuestionType.MULTIPLE_CHOICE;
  const question = await prisma.question.upsert({
    where: { externalId: english.externalId },
    update: {
      categoryId: category.id,
      topicId: topic.id,
      type,
      difficulty: english.points,
      imageUrl: browserMediaUrl(english.imagePath, "images"),
      videoUrl: browserMediaUrl(english.videoPath, "videos"),
      isActive: true,
    },
    create: {
      externalId: english.externalId,
      categoryId: category.id,
      topicId: topic.id,
      type,
      difficulty: english.points,
      imageUrl: browserMediaUrl(english.imagePath, "images"),
      videoUrl: browserMediaUrl(english.videoPath, "videos"),
    },
  });

  for (const [code, row] of [["en", english], ["de", german]] as const) {
    if (!row) continue;
    await prisma.questionTranslation.upsert({
      where: {
        questionId_languageId: {
          questionId: question.id,
          languageId: languageIds[code],
        },
      },
      update: { text: row.questionText, explanation: row.explanation },
      create: {
        questionId: question.id,
        languageId: languageIds[code],
        text: row.questionText,
        explanation: row.explanation,
      },
    });
  }

  const optionKeys = english.options.map((option) => option.key);
  await prisma.answerOption.deleteMany({
    where: { questionId: question.id, key: { notIn: optionKeys } },
  });
  for (const [index, englishOption] of english.options.entries()) {
    const option = await prisma.answerOption.upsert({
      where: {
        questionId_key: {
          questionId: question.id,
          key: englishOption.key,
        },
      },
      update: {
        isCorrect: english.correctKeys.includes(englishOption.key),
        sortOrder: index,
      },
      create: {
        questionId: question.id,
        key: englishOption.key,
        isCorrect: english.correctKeys.includes(englishOption.key),
        sortOrder: index,
      },
    });
    const germanOption = german?.options.find((item) => item.key === englishOption.key);
    for (const [code, text] of [
      ["en", englishOption.text],
      ["de", germanOption?.text],
    ] as const) {
      if (!text) continue;
      await prisma.answerOptionTranslation.upsert({
        where: {
          answerOptionId_languageId: {
            answerOptionId: option.id,
            languageId: languageIds[code],
          },
        },
        update: { text },
        create: {
          answerOptionId: option.id,
          languageId: languageIds[code],
          text,
        },
      });
    }
  }
}

function assertImportAllowed() {
  if (process.env.MY_BASE_RIGHTS_CONFIRMED !== "true") {
    throw new Error(
      "Import blocked: this extracted archive self-identifies as official copyrighted material. " +
      "The project requirement prohibits using it. Only after confirming you hold import and publication rights, " +
      "run with MY_BASE_RIGHTS_CONFIRMED=true.",
    );
  }
}

async function main() {
  assertImportAllowed();
  const englishFile = findSourceFile("");
  const germanFile = findSourceFile("_de");
  if (!englishFile) throw new Error(`No English JSON or CSV dataset found in ${extractedRoot}.`);

  const englishRaw = await loadRows(englishFile);
  const germanRaw = germanFile ? await loadRows(germanFile) : [];
  const englishRows = englishRaw
    .map((row, index) => normalizeRow(row, englishFile, index + 2))
    .filter((row): row is NormalizedRow => Boolean(row));
  const germanRows = germanRaw
    .map((row, index) => normalizeRow(row, germanFile!, index + 2))
    .filter((row): row is NormalizedRow => Boolean(row));
  const germanById = new Map(germanRows.map((row) => [row.externalId, row]));

  const languages = await prisma.language.findMany({
    where: { code: { in: ["en", "de"] } },
  });
  const languageIds = Object.fromEntries(
    languages.map((language) => [language.code, language.id]),
  ) as Partial<Record<"en" | "de", string>>;
  if (!languageIds.en || !languageIds.de) {
    throw new Error("English and German language seed records are required. Run npm run seed first.");
  }

  const [copiedImages, copiedVideos] = await Promise.all([
    copyMediaDirectory("images"),
    copyMediaDirectory("videos"),
  ]);

  let imported = 0;
  for (const row of englishRows) {
    try {
      await importQuestion(
        row,
        germanById.get(row.externalId),
        languageIds as Record<"en" | "de", string>,
      );
      imported += 1;
      if (imported % 250 === 0) console.log(`Imported ${imported}/${englishRows.length} questions...`);
    } catch (error) {
      warn(`Question import failed`);
      console.warn(
        `[warning] ${row.externalId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  console.log(`Imported or updated ${imported} bilingual question(s).`);
  console.log(`Copied ${copiedImages} image(s) and ${copiedVideos} video(s).`);
  console.log(`Skipped ${englishRaw.length - englishRows.length} invalid or unsupported English record(s).`);
  if (warnings.size) {
    console.warn("Import warnings:");
    for (const [message, count] of warnings) console.warn(`- ${message}: ${count}`);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
