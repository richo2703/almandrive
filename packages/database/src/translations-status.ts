import "./load-env.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const totalQuestions = await prisma.question.count();
  const languages = await prisma.language.findMany({
    where: { code: { in: ["en", "de", "ru", "tr", "uz"] } },
    select: { id: true, code: true },
  });
  const languagesByCode = new Map(languages.map((language) => [language.code, language.id]));
  const counts = await prisma.questionTranslation.groupBy({
    by: ["languageId"],
    _count: { _all: true },
  });
  const countsByLanguage = new Map(counts.map((row) => [row.languageId, row._count._all]));

  const summary = {
    totalQuestions,
    enTranslations: countsByLanguage.get(languagesByCode.get("en") ?? "") ?? 0,
    deTranslations: countsByLanguage.get(languagesByCode.get("de") ?? "") ?? 0,
    ruTranslations: countsByLanguage.get(languagesByCode.get("ru") ?? "") ?? 0,
    trTranslations: countsByLanguage.get(languagesByCode.get("tr") ?? "") ?? 0,
    uzTranslations: countsByLanguage.get(languagesByCode.get("uz") ?? "") ?? 0,
    missingRu: totalQuestions - (countsByLanguage.get(languagesByCode.get("ru") ?? "") ?? 0),
    missingTr: totalQuestions - (countsByLanguage.get(languagesByCode.get("tr") ?? "") ?? 0),
    missingUz: totalQuestions - (countsByLanguage.get(languagesByCode.get("uz") ?? "") ?? 0),
  };

  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    if (String(error?.message ?? "").includes("Can't reach database server")) {
      console.error("Database unavailable at localhost:5432. Start PostgreSQL and rerun npm run translations:status.");
      process.exitCode = 1;
      return;
    }
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
