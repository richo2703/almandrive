import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { Bot, InlineKeyboard } from "grammy";
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
    const keyboard = new InlineKeyboard().webApp("Open Theorie Direkt", env.WEB_APP_URL);
    await ctx.reply(
      "Learn German driving theory with original practice questions. Question content is currently available in English.",
      { reply_markup: keyboard },
    );
  });

  bot.catch((error) => console.error("Telegram bot error:", error.error));
  bot.start({
    onStart: ({ username }) => console.log(`Theorie Direkt bot @${username} is running.`),
  });
}
