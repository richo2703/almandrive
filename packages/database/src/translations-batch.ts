import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";
import {
  escapeCsvCell,
  translationCsvHeaders,
  type TranslationCsvRow,
} from "./translation-workflow.js";

export const translationBatchLanguage = "ru" as const;
export const translationBatchSize = 100;
const sourceHeaders = translationCsvHeaders.slice(0, 9);

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const translationsDir = resolve(projectRoot, "import/translations");
const batchDir = resolve(translationsDir, "batches", translationBatchLanguage);
const missingFile = resolve(translationsDir, `missing-${translationBatchLanguage}.csv`);
const completedFile = resolve(translationsDir, `completed-${translationBatchLanguage}.csv`);

function serializeRow(row: TranslationCsvRow) {
  return translationCsvHeaders
    .map((header) => escapeCsvCell(row[header] ?? ""))
    .join(",");
}

function serializeFile(rows: TranslationCsvRow[]) {
  return [
    translationCsvHeaders.join(","),
    ...rows.map((row) => serializeRow(row)),
  ].join("\n");
}

async function parseCsvFile(filePath: string) {
  const source = await readFile(filePath, "utf8");
  return parse(source, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  }) as TranslationCsvRow[];
}

function ensureHeaderShape(rows: TranslationCsvRow[]) {
  for (const row of rows) {
    for (const header of translationCsvHeaders) {
      if (typeof row[header] !== "string") {
        row[header] = "";
      }
    }
  }
}

function compareSourceColumns(left: TranslationCsvRow, right: TranslationCsvRow) {
  return sourceHeaders.every((header) => left[header] === right[header]);
}

async function splitRu() {
  const rows = await parseCsvFile(missingFile);
  ensureHeaderShape(rows);
  await mkdir(batchDir, { recursive: true });
  const expectedBatches = Math.ceil(rows.length / translationBatchSize);
  for (let index = 0; index < expectedBatches; index += 1) {
    const start = index * translationBatchSize;
    const batchRows = rows.slice(start, start + translationBatchSize);
    const batchNumber = String(index + 1).padStart(3, "0");
    const filePath = resolve(batchDir, `ru-batch-${batchNumber}.csv`);
    await writeFile(filePath, `${serializeFile(batchRows)}\n`, "utf8");
    console.log(`Wrote ${batchRows.length} row(s) to ${filePath}`);
  }
  console.log(`Split ${rows.length} row(s) into ${expectedBatches} batch file(s).`);
}

async function mergeRu() {
  const originalRows = await parseCsvFile(missingFile);
  ensureHeaderShape(originalRows);
  const files = (await readdir(batchDir))
    .filter((name) => /^ru-batch-\d{3}-translated\.csv$/.test(name))
    .sort((left, right) => left.localeCompare(right));

  if (!files.length) {
    throw new Error(`No translated batch files found in ${batchDir}`);
  }

  const mergedRows: TranslationCsvRow[] = [];

  for (const fileName of files) {
    const translatedPath = resolve(batchDir, fileName);
    const batchId = fileName.replace(/-translated\.csv$/, ".csv");
    const originalPath = resolve(batchDir, batchId);
    const translatedRows = await parseCsvFile(translatedPath);
    const batchOriginalRows = await parseCsvFile(originalPath);
    ensureHeaderShape(translatedRows);
    ensureHeaderShape(batchOriginalRows);

    if (translatedRows.length !== batchOriginalRows.length) {
      throw new Error(
        `${fileName} has ${translatedRows.length} row(s); expected ${batchOriginalRows.length}.`,
      );
    }

    for (let index = 0; index < translatedRows.length; index += 1) {
      const translatedRow = translatedRows[index]!;
      const originalRow = batchOriginalRows[index]!;
      if (!compareSourceColumns(translatedRow, originalRow)) {
        throw new Error(`${fileName} row ${index + 1} changed source columns or order.`);
      }
      mergedRows.push(translatedRow);
    }
  }

  if (mergedRows.length !== originalRows.length) {
    throw new Error(
      `Merged row count ${mergedRows.length} does not match missing-ru.csv row count ${originalRows.length}.`,
    );
  }

  await writeFile(completedFile, `${serializeFile(mergedRows)}\n`, "utf8");
  console.log(`Wrote ${mergedRows.length} row(s) to ${completedFile}`);
}

export async function runTranslationBatchCommand(command: "split" | "merge") {
  if (command === "split") {
    await splitRu();
    return;
  }
  await mergeRu();
}
