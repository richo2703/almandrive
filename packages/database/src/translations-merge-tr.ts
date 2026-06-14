import { runTranslationBatchCommand } from "./translations-batch.js";

runTranslationBatchCommand("merge", "tr").catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
