import { runTranslationBatchCommand } from "./translations-batch.js";

runTranslationBatchCommand("split", "uz").catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
