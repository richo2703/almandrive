import { runTranslationBatchCommand } from "./translations-batch.js";

runTranslationBatchCommand("merge", "uz").catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
