import express from "express";
import cors from "cors";
import helmet from "helmet";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { env } from "./config/env.js";
import { authRouter } from "./routes/auth.js";
import { catalogRouter } from "./routes/catalog.js";
import { questionRouter } from "./routes/questions.js";
import { progressRouter } from "./routes/progress.js";
import { examRouter } from "./routes/exams.js";
import { shopRouter } from "./routes/shop.js";
import { adminRouter } from "./routes/admin.js";
import { requireAuth } from "./middleware/auth.js";
import { errorHandler } from "./middleware/error.js";

const app = express();
app.set("trust proxy", 1);

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      scriptSrc: ["'self'", "https://telegram.org"],
    },
  },
}));
app.use(cors({ origin: env.WEB_APP_URL, credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRouter);
app.use("/api", requireAuth, catalogRouter);
app.use("/api/questions", requireAuth, questionRouter);
app.use("/api", requireAuth, progressRouter);
app.use("/api", requireAuth, shopRouter);
app.use("/api/exam", requireAuth, examRouter);
app.use("/api/quiz-sessions", requireAuth, examRouter);
app.use("/api/admin", adminRouter);
const webDistPath = resolve(process.cwd(), "apps/web/dist");
if (existsSync(webDistPath)) {
  app.use(express.static(webDistPath));
  app.get(/^(?!\/api).*$/, (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      next();
      return;
    }
    const indexPath = resolve(webDistPath, "index.html");
    if (existsSync(indexPath)) {
      res.sendFile(indexPath);
      return;
    }
    next();
  });
}
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Alman Drive API listening on http://localhost:${env.PORT}`);
});
