import "./load-env.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const demoQuestions = await prisma.question.count({
    where: { externalId: { startsWith: "demo-" } },
  });
  const result = await prisma.question.deleteMany({
    where: { externalId: { startsWith: "demo-" } },
  });
  console.log(`Deleted ${result.count} demo question(s); expected ${demoQuestions}.`);
  console.log("Users, languages, categories, topics, and non-demo questions were preserved.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
