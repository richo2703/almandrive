import { runTranslationBatchCommand } from "./translations-batch.js";

runTranslationBatchCommand("merge", "ru").catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
