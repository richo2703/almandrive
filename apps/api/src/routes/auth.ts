import { Router } from "express";
import { Prisma, prisma } from "@theorie-direkt/database";
import { telegramAuthSchema } from "@theorie-direkt/shared";
import { env } from "../config/env.js";
import {
  createSessionToken,
  validateTelegramInitData,
  type TelegramUser,
} from "../utils/telegram.js";

export const authRouter = Router();
const DEVELOPMENT_TELEGRAM_ID = 999999001n;

async function upsertTelegramUser(
  telegramUser: TelegramUser,
  interfaceLanguageId: string,
  selectedCategoryId: string,
) {
  const telegramId =
    telegramUser.id === Number(DEVELOPMENT_TELEGRAM_ID)
      ? DEVELOPMENT_TELEGRAM_ID
      : BigInt(telegramUser.id);
  const userData = {
    username: telegramUser.username,
    firstName: telegramUser.first_name,
    lastName: telegramUser.last_name,
    languageCode: telegramUser.language_code,
    photoUrl: telegramUser.photo_url,
    lastSeenAt: new Date(),
    isAdmin:
      env.ADMIN_TELEGRAM_IDS.includes(telegramId) ||
      env.DEV_ADMIN_TELEGRAM_ID === telegramId,
  };

  try {
    return await prisma.user.upsert({
      where: { telegramId },
      update: userData,
      create: {
        telegramId,
        ...userData,
        firstSeenAt: new Date(),
        interfaceLanguageId,
        selectedCategoryId,
      },
      include: { interfaceLanguage: true, selectedCategory: true },
    });
  } catch (error) {
    // Concurrent local browser requests can race during the initial insert.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return prisma.user.findUniqueOrThrow({
        where: { telegramId },
        include: { interfaceLanguage: true, selectedCategory: true },
      });
    }
    throw error;
  }
}

authRouter.post("/telegram", async (req, res) => {
  const { initData } = telegramAuthSchema.parse(req.body);
  let telegramUser: TelegramUser;

  const allowDevelopmentAuth =
    env.DEV_AUTH_ENABLED &&
    (env.NODE_ENV !== "production" || env.DEV_AUTH_ALLOW_IN_PRODUCTION);

  if (!initData) {
    if (allowDevelopmentAuth) {
      const devTelegramId = env.DEV_ADMIN_TELEGRAM_ID ?? DEVELOPMENT_TELEGRAM_ID;
      telegramUser = {
        id: Number(devTelegramId),
        first_name: "Local",
        username: "local_demo",
        language_code: "en",
      };
    } else {
      res.status(400).json({
        error: "telegram_init_data_required",
        message: "Please open Alman Drive inside Telegram.",
      });
      return;
    }
  } else {
    if (!env.TELEGRAM_BOT_TOKEN) {
      res.status(503).json({ error: "TELEGRAM_BOT_TOKEN is not configured." });
      return;
    }
    try {
      telegramUser = validateTelegramInitData(
        initData,
        env.TELEGRAM_BOT_TOKEN,
        env.TELEGRAM_AUTH_MAX_AGE_SECONDS,
      );
    } catch (error) {
      res.status(401).json({
        error: "telegram_init_data_invalid",
        message: error instanceof Error ? error.message : "Invalid Telegram initData.",
      });
      return;
    }
  }

  const english = await prisma.language.findUniqueOrThrow({ where: { code: "en" } });
  const categoryB = await prisma.licenseCategory.findUniqueOrThrow({ where: { code: "B" } });
  const user = await upsertTelegramUser(telegramUser, english.id, categoryB.id);

  res.json({
    token: createSessionToken(
      user.id,
      env.TELEGRAM_BOT_TOKEN || "local-development-secret",
    ),
    user: {
      id: user.id,
      firstName: user.firstName,
      username: user.username,
      isAdmin: user.isAdmin,
      interfaceLanguage: user.interfaceLanguage?.code ?? "en",
      category: user.selectedCategory?.code ?? "B",
    },
  });
});
