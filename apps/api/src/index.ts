import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { authRouter } from "./routes/auth.js";
import { catalogRouter } from "./routes/catalog.js";
import { questionRouter } from "./routes/questions.js";
import { progressRouter } from "./routes/progress.js";
import { examRouter } from "./routes/exams.js";
import { requireAuth } from "./middleware/auth.js";
import { errorHandler } from "./middleware/error.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.WEB_APP_URL, credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRouter);
app.use("/api", requireAuth, catalogRouter);
app.use("/api/questions", requireAuth, questionRouter);
app.use("/api", requireAuth, progressRouter);
app.use("/api/exam", requireAuth, examRouter);
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Theorie Direkt API listening on http://localhost:${env.PORT}`);
});
