export const translationTargetLanguages = ["ru", "tr", "uz"] as const;

export type TranslationTargetLanguage = (typeof translationTargetLanguages)[number];

export const translationCsvHeaders = [
  "questionExternalId",
  "sourceLanguage",
  "targetLanguage",
  "questionTextSource",
  "explanationSource",
  "answerASource",
  "answerBSource",
  "answerCSource",
  "answerDSource",
  "questionTextTarget",
  "explanationTarget",
  "answerATarget",
  "answerBTarget",
  "answerCTarget",
  "answerDTarget",
] as const;

type CsvRow = Record<(typeof translationCsvHeaders)[number], string>;

type TranslationLike = {
  language: { code: string };
};

type QuestionTranslationLike = TranslationLike & {
  text: string;
  explanation: string | null;
};

type OptionTranslationLike = TranslationLike & {
  text: string;
};

export function escapeCsvCell(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

export function serializeCsv(rows: CsvRow[]) {
  return [
    translationCsvHeaders.join(","),
    ...rows.map((row) =>
      translationCsvHeaders
        .map((header) => escapeCsvCell(row[header] ?? ""))
        .join(","),
    ),
  ].join("\n");
}

export function normalizeCell(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function pickQuestionSourceTranslation(translations: QuestionTranslationLike[]) {
  return (
    translations.find((translation) => translation.language.code === "en") ??
    translations.find((translation) => translation.language.code === "de") ??
    translations[0] ??
    null
  );
}

export function pickOptionSourceTranslation(translations: OptionTranslationLike[]) {
  return (
    translations.find((translation) => translation.language.code === "en") ??
    translations.find((translation) => translation.language.code === "de") ??
    translations[0] ??
    null
  );
}

export type {
  CsvRow as TranslationCsvRow,
  QuestionTranslationLike,
  OptionTranslationLike,
};
