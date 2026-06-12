import { prisma } from "@theorie-direkt/database";

export async function getRequestLanguageCode(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      interfaceLanguage: { select: { code: true } },
    },
  });
  return user?.interfaceLanguage?.code ?? "en";
}

export async function getRequestCategoryCode(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      selectedCategory: { select: { code: true } },
    },
  });
  return user?.selectedCategory?.code ?? "B";
}
