import { Router } from "express";
import { prisma } from "@theorie-direkt/database";
import { preferenceSchema } from "@theorie-direkt/shared";
import { getRequestLanguageCode } from "../services/request-context.js";

export const catalogRouter = Router();

catalogRouter.get("/languages", async (_req, res) => {
  const languages = await prisma.language.findMany({ orderBy: { name: "asc" } });
  res.json(languages);
});

catalogRouter.get("/categories", async (_req, res) => {
  const categories = await prisma.licenseCategory.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  res.json(categories);
});

catalogRouter.get("/topics", async (_req, res) => {
  const languageCode = await getRequestLanguageCode(_req.userId!);
  const topics = await prisma.topic.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      translations: {
        where: { language: { code: { in: [languageCode, "en"] } } },
        include: { language: { select: { code: true } } },
      },
    },
  });
  res.json(
    topics.map((topic) => ({
      id: topic.id,
      slug: topic.slug,
      name:
        topic.translations.find((translation) => translation.language.code === languageCode)?.name
        ?? topic.translations.find((translation) => translation.language.code === "en")?.name
        ?? topic.slug,
    })),
  );
});

catalogRouter.patch("/profile/preferences", async (req, res) => {
  const { language, category } = preferenceSchema.parse(req.body);
  const [languageRecord, categoryRecord] = await Promise.all([
    language ? prisma.language.findUniqueOrThrow({ where: { code: language } }) : null,
    category ? prisma.licenseCategory.findUniqueOrThrow({ where: { code: category } }) : null,
  ]);
  const user = await prisma.user.update({
    where: { id: req.userId! },
    data: {
      ...(languageRecord ? { interfaceLanguageId: languageRecord.id } : {}),
      ...(categoryRecord ? { selectedCategoryId: categoryRecord.id } : {}),
    },
    include: { interfaceLanguage: true, selectedCategory: true },
  });
  res.json({
    language: user.interfaceLanguage?.code ?? "en",
    category: user.selectedCategory?.code ?? "B",
  });
});
