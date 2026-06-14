import "./load-env.js";
import { PrismaClient } from "@prisma/client";
import { catalogLanguageCodes } from "./catalog-localization.js";

const prisma = new PrismaClient();

type TopicRow = {
  id: string;
  slug: string;
  sortOrder: number;
  questionCount: number;
  names: Record<string, string | null>;
};

function normalizeName(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

async function main() {
  const topics = await prisma.$queryRaw<TopicRow[]>`
    SELECT
      t."id" AS "id",
      t."slug" AS "slug",
      t."sortOrder" AS "sortOrder",
      COUNT(q."id")::int AS "questionCount",
      jsonb_object_agg(l."code", tt."name") FILTER (WHERE l."code" IS NOT NULL) AS "names"
    FROM "Topic" t
    LEFT JOIN "Question" q ON q."topicId" = t."id"
    LEFT JOIN "TopicTranslation" tt ON tt."topicId" = t."id"
    LEFT JOIN "Language" l ON l."id" = tt."languageId"
    GROUP BY t."id", t."slug", t."sortOrder"
    ORDER BY t."sortOrder" ASC, t."slug" ASC
  `;

  const byLanguage = new Map<string, Map<string, TopicRow[]>>();
  for (const language of catalogLanguageCodes) {
    byLanguage.set(language, new Map());
  }

  for (const topic of topics) {
    for (const language of catalogLanguageCodes) {
      const name = topic.names?.[language] ?? null;
      if (!name) continue;
      const key = normalizeName(name);
      const languageMap = byLanguage.get(language)!;
      const list = languageMap.get(key) ?? [];
      list.push(topic);
      languageMap.set(key, list);
    }
  }

  const candidates = new Map<string, TopicRow>();
  for (const topic of topics) {
    if (topic.questionCount > 0) continue;
    const hasDuplicateLabel = catalogLanguageCodes.some((language) => {
      const name = topic.names?.[language] ?? null;
      if (!name) return false;
      const matches = byLanguage.get(language)?.get(normalizeName(name)) ?? [];
      return matches.some((other) => other.id !== topic.id && other.questionCount > 0);
    });
    if (hasDuplicateLabel) {
      candidates.set(topic.id, topic);
    }
  }

  if (!candidates.size) {
    console.log("No empty duplicate topics found.");
    return;
  }

  const ids = [...candidates.keys()];
  const deleted = await prisma.topic.deleteMany({ where: { id: { in: ids } } });

  console.log(`Deleted ${deleted.count} empty duplicate topic(s).`);
  for (const topic of candidates.values()) {
    console.log(`- ${topic.slug} (${topic.questionCount} questions)`);
  }
}

main()
  .catch((error) => {
    if (String(error?.message ?? "").includes("Can't reach database server")) {
      console.error("Database unavailable at localhost:5432. Start PostgreSQL and rerun npm run catalog:prune-empty-duplicates.");
      process.exitCode = 1;
      return;
    }
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
