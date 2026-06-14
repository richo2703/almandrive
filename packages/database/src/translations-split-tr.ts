import { runTranslationBatchCommand } from "./translations-batch.js";

runTranslationBatchCommand("split", "tr").catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
