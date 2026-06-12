import { runTranslationBatchCommand } from "./translations-batch.js";

runTranslationBatchCommand("split").catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
