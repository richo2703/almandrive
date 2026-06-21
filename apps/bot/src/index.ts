import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { Bot, InlineKeyboard } from "grammy";
import { prisma } from "@theorie-direkt/database";
import { z } from "zod";

const envPath = [
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "../../.env"),
].find(existsSync);
if (envPath) config({ path: envPath });

const env = z.object({
  TELEGRAM_BOT_TOKEN: z.string().default(""),
  WEB_APP_URL: z.string().url().default("http://localhost:5173"),
}).parse(process.env);

if (!env.TELEGRAM_BOT_TOKEN) {
  console.log("Bot not started: set TELEGRAM_BOT_TOKEN in .env.");
} else {
  const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

  bot.command("start", async (ctx) => {
    const keyboard = new InlineKeyboard().webApp("🚗 Open Alman Drive", env.WEB_APP_URL);
    await ctx.reply(
      [
        "🚗 Alman Drive",
        "",
        "🇺🇿 Germaniyada haydovchilik nazariy imtihoniga tayyorlaning. Testlar, mavzular va progress — Telegram ichida.",
        "",
        "🇷🇺 Готовьтесь к теоретическому экзамену на водительские права в Германии. Тесты, темы и прогресс — прямо в Telegram.",
        "",
        "🇩🇪 Bereiten Sie sich auf die theoretische Führerscheinprüfung in Deutschland vor. Tests, Themen und Fortschritt — direkt in Telegram.",
        "",
        "🇬🇧 Prepare for the German driving theory exam. Tests, topics and progress — directly in Telegram.",
      ].join("\n"),
      { reply_markup: keyboard },
    );
  });

  bot.on("pre_checkout_query", async (ctx) => {
    const payload = ctx.preCheckoutQuery.invoice_payload;
    const order = await prisma.paymentOrder.findUnique({ where: { payload }, include: { product: true } });
    if (!order || order.status !== "PENDING") {
      await ctx.answerPreCheckoutQuery(false, "Payment order not found.");
      return;
    }
    if (ctx.preCheckoutQuery.currency !== "XTR") {
      await ctx.answerPreCheckoutQuery(false, "Unsupported currency.");
      return;
    }
    if (ctx.preCheckoutQuery.total_amount !== order.amountStarsFinal) {
      await ctx.answerPreCheckoutQuery(false, "Price mismatch.");
      return;
    }
    await ctx.answerPreCheckoutQuery(true);
  });

  bot.on("message", async (ctx) => {
    const payment = ctx.message?.successful_payment;
    if (!payment) return;

    const order = await prisma.paymentOrder.findUnique({
      where: { payload: payment.invoice_payload },
      include: { product: true, promoCode: true },
    });
    if (!order) {
      console.warn("Payment received for unknown payload:", payment.invoice_payload);
      return;
    }

    if (order.status === "PAID") return;

    await prisma.paymentOrder.update({
      where: { id: order.id },
      data: {
        status: "PAID",
        telegramPaymentChargeId: payment.telegram_payment_charge_id,
        paidAt: new Date(),
      },
    });

    const user = await prisma.user.findUnique({ where: { telegramId: BigInt(ctx.from.id) } });
    if (!user) {
      console.warn("Payment received for unknown Telegram user:", ctx.from.id);
      return;
    }

    const existingAccess = await prisma.userAccess.findFirst({
      where: { paymentOrderId: order.id },
    });
    if (existingAccess) return;

    const startsAt = new Date();
    const expiresAt = order.product.isLifetime || order.product.accessDays == null
      ? null
      : new Date(Date.now() + order.product.accessDays * 24 * 60 * 60 * 1000);

    const access = await prisma.userAccess.create({
      data: {
        userId: user.id,
        productId: order.productId,
        paymentOrderId: order.id,
        promoCodeId: order.promoCodeId,
        source: "PAYMENT",
        startsAt,
        expiresAt,
        isLifetime: order.product.isLifetime,
        isActive: true,
        internalNote: `Telegram payment ${payment.telegram_payment_charge_id}`,
      },
    });

    await prisma.promoCodeUsage.updateMany({
      where: { paymentOrderId: order.id },
      data: { userAccessId: access.id },
    });
  });

  bot.catch((error) => console.error("Telegram bot error:", error.error));
  bot.start({
    onStart: ({ username }) => console.log(`Alman Drive bot @${username} is running.`),
  });
}
