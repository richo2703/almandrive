import { runTranslationBatchCommand } from "./translations-batch.js";

runTranslationBatchCommand("merge").catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
