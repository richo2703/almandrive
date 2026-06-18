import { Router } from "express";
import { Prisma, prisma } from "@theorie-direkt/database";
import { z } from "zod";
import { requireAdmin, resolveAdminIdentity } from "../middleware/admin-session.js";
import { env } from "../config/env.js";
import { adminLoginRateLimit } from "../middleware/rate-limit.js";
import { createAdminSessionToken, clearAdminSessionCookie, setAdminSessionCookie, verifyAdminPassword } from "../utils/admin-session.js";

export const adminRouter = Router();

const productSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  priceStars: z.coerce.number().int().min(1),
  accessDays: z.coerce.number().int().min(1).optional().nullable(),
  isLifetime: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
  badgeText: z.string().optional().nullable(),
  oldPriceStars: z.coerce.number().int().min(1).optional().nullable(),
});

const promoCodeSchema = z.object({
  code: z.string().min(1),
  type: z.enum(["FREE_ACCESS", "PERCENT_DISCOUNT", "FIXED_STARS_DISCOUNT"]),
  discountPercent: z.coerce.number().int().min(1).max(100).optional().nullable(),
  discountStars: z.coerce.number().int().min(1).optional().nullable(),
  accessDays: z.coerce.number().int().min(1).optional().nullable(),
  isLifetime: z.boolean().default(false),
  maxUses: z.coerce.number().int().positive().optional().nullable(),
  maxUsesPerUser: z.coerce.number().int().positive().optional().nullable(),
  validFrom: z.string().datetime().optional().nullable(),
  validUntil: z.string().datetime().optional().nullable(),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});

const userGrantSchema = z.object({
  accessDays: z.coerce.number().int().min(1).optional().nullable(),
  isLifetime: z.boolean().default(false),
  reason: z.string().optional().nullable(),
  internalNote: z.string().optional().nullable(),
  productId: z.string().cuid().optional().nullable(),
});

const userCreateSchema = z.object({
  telegramId: z.coerce.bigint(),
  username: z.string().trim().min(1).optional().nullable(),
  firstName: z.string().trim().min(1).optional().nullable(),
  lastName: z.string().trim().min(1).optional().nullable(),
  languageCode: z.string().default("en"),
  categoryCode: z.string().default("B"),
  adminNote: z.string().optional().nullable(),
  grantAccess: z.object({
    accessDays: z.coerce.number().int().min(1).optional().nullable(),
    isLifetime: z.boolean().default(false),
    reason: z.string().optional().nullable(),
  }).optional().nullable(),
});

const usersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  q: z.string().trim().default(""),
  includeDeleted: z.coerce.boolean().default(false),
});

const hardDeleteSchema = z.object({
  confirm: z.literal("PERMANENTLY_DELETE"),
});

const userBlockSchema = z.object({
  isBlocked: z.boolean(),
  adminNote: z.string().optional().nullable(),
});

const bannerSchema = z.object({
  imageUrl: z.string().url().optional().nullable(),
  title: z.string().min(1),
  subtitle: z.string().optional().nullable(),
  buttonText: z.string().optional().nullable(),
  buttonUrl: z.string().url().optional().nullable(),
  placement: z.enum(["HOME_TOP", "HOME_MIDDLE", "PRICING_TOP", "QUIZ_BOTTOM", "LEARN_TOP"]),
  languageCode: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
  validFrom: z.string().datetime().optional().nullable(),
  validUntil: z.string().datetime().optional().nullable(),
});

const promotionSchema = z.object({
  imageUrl: z.string().url().optional().nullable(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  buttonText: z.string().optional().nullable(),
  buttonUrl: z.string().url().optional().nullable(),
  linkedProductId: z.string().cuid().optional().nullable(),
  promoCodeId: z.string().cuid().optional().nullable(),
  languageCode: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  validFrom: z.string().datetime().optional().nullable(),
  validUntil: z.string().datetime().optional().nullable(),
  sortOrder: z.coerce.number().int().default(0),
});

const newsSchema = z.object({
  title: z.string().min(1),
  excerpt: z.string().optional().nullable(),
  body: z.string().min(1),
  imageUrl: z.string().url().optional().nullable(),
  languageCode: z.string().optional().nullable(),
  isPublished: z.boolean().default(false),
  publishedAt: z.string().datetime().optional().nullable(),
  sortOrder: z.coerce.number().int().default(0),
});

function parseDate(value?: string | null) {
  return value ? new Date(value) : null;
}

function serializeUser(user: {
  telegramId: bigint;
  deletedAt?: Date | null;
  [key: string]: unknown;
}) {
  return {
    ...user,
    telegramId: user.telegramId.toString(),
    deletedAt: user.deletedAt ? user.deletedAt.toISOString() : null,
  };
}

function serializePaymentOrder(order: any) {
  return {
    ...order,
    user: order.user ? serializeUser(order.user) : null,
  };
}

function serializePromoCode(promoCode: any) {
  return {
    ...promoCode,
    usages: promoCode.usages?.map((usage: any) => ({
      ...usage,
      user: usage.user ? serializeUser(usage.user) : null,
    })),
  };
}

function buildUserWhere(q: string, includeDeleted: boolean): Prisma.UserWhereInput {
  return {
    ...(includeDeleted ? {} : { deletedAt: null }),
    ...(q
      ? {
          OR: [
            ...( /^\d+$/.test(q) ? [{ telegramId: BigInt(q) }] : [] ),
            { username: { contains: q, mode: "insensitive" } },
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

async function loadUserRelations(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      paymentOrders: { orderBy: { createdAt: "desc" }, include: { product: true, promoCode: true } },
      userAccesses: { orderBy: { createdAt: "desc" }, include: { product: true, promoCode: true } },
      promoCodeUsages: { orderBy: { usedAt: "desc" }, include: { promoCode: true } },
      interfaceLanguage: true,
      selectedCategory: true,
    },
  });
}

adminRouter.post("/login", adminLoginRateLimit, async (req, res) => {
  const body = z.object({ username: z.string().min(1), password: z.string().min(1) }).safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Validation failed." });
    return;
  }
  if (!env.ADMIN_SESSION_SECRET || !env.ADMIN_PASSWORD_HASH) {
    res.status(503).json({ error: "Admin login is not configured." });
    return;
  }
  if (body.data.username !== env.ADMIN_USERNAME) {
    res.status(401).json({ error: "Invalid credentials." });
    return;
  }
  if (!verifyAdminPassword(body.data.password, env.ADMIN_PASSWORD_HASH)) {
    res.status(401).json({ error: "Invalid credentials." });
    return;
  }
  const token = createAdminSessionCookie(body.data.username);
  setAdminSessionCookie(res, token);
  res.json({ ok: true, username: body.data.username });
});

adminRouter.post("/logout", async (_req, res) => {
  clearAdminSessionCookie(res);
  res.json({ ok: true });
});

adminRouter.get("/me", async (req, res) => {
  const identity = await resolveAdminIdentity(req);
  if (!identity) {
    res.status(401).json({ error: "Access denied." });
    return;
  }
  res.json({ ok: true, username: identity.username });
});

adminRouter.use(requireAdmin);

function createAdminSessionCookie(username: string) {
  if (!env.ADMIN_SESSION_SECRET) throw new Error("ADMIN_SESSION_SECRET is not configured.");
  return createAdminSessionToken(
    { username, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 },
    env.ADMIN_SESSION_SECRET,
  );
}

adminRouter.get("/dashboard", async (_req, res) => {
  const [totalUsers, activeSubscribers, revenue, ordersToday, ordersMonth, activePromoCodes, activeBanners, recentOrders, recentUsers] =
    await Promise.all([
      prisma.user.count(),
      prisma.userAccess.count({ where: { isActive: true, revokedAt: null, OR: [{ isLifetime: true }, { expiresAt: { gt: new Date() } }] } }),
      prisma.paymentOrder.aggregate({ where: { status: "PAID" }, _sum: { amountStarsFinal: true } }),
      prisma.paymentOrder.count({ where: { status: "PAID", paidAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
      prisma.paymentOrder.count({ where: { status: "PAID", paidAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } }),
      prisma.promoCode.count({ where: { isActive: true } }),
      prisma.banner.count({ where: { isActive: true } }),
      prisma.paymentOrder.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { user: true, product: true, promoCode: true } }),
      prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    ]);

  res.json({
    totalUsers,
    activeSubscribers,
    revenueStars: revenue._sum.amountStarsFinal ?? 0,
    ordersToday,
    ordersMonth,
    activePromoCodes,
    activeBanners,
    recentOrders: recentOrders.map(serializePaymentOrder),
    recentUsers: recentUsers.map(serializeUser),
    adminTelegramIds: env.ADMIN_TELEGRAM_IDS.map(String),
  });
});

adminRouter.get("/meta/languages", async (_req, res) => {
  res.json(await prisma.language.findMany({ orderBy: { code: "asc" } }));
});

adminRouter.get("/meta/categories", async (_req, res) => {
  res.json(await prisma.licenseCategory.findMany({ orderBy: { code: "asc" } }));
});

adminRouter.get("/products", async (_req, res) => {
  res.json(await prisma.product.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] }));
});
adminRouter.post("/products", async (req, res) => {
  const data = productSchema.parse(req.body);
  res.status(201).json(await prisma.product.create({ data }));
});
adminRouter.patch("/products/:id", async (req, res) => {
  const data = productSchema.partial().parse(req.body);
  res.json(await prisma.product.update({ where: { id: req.params.id }, data }));
});
adminRouter.delete("/products/:id", async (req, res) => {
  const paidOrders = await prisma.paymentOrder.count({ where: { productId: req.params.id, status: "PAID" } });
  if (paidOrders > 0) {
    const product = await prisma.product.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ deactivated: true, product });
    return;
  }
  await prisma.product.delete({ where: { id: req.params.id } });
  res.json({ deleted: true });
});

adminRouter.get("/promo-codes", async (_req, res) => {
  const promoCodes = await prisma.promoCode.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: { usages: { include: { user: true } } },
  });
  res.json(promoCodes.map(serializePromoCode));
});
adminRouter.post("/promo-codes", async (req, res) => {
  const data = promoCodeSchema.parse(req.body);
  res.status(201).json(await prisma.promoCode.create({
    data: {
      ...data,
      code: data.code.toUpperCase(),
      validFrom: parseDate(data.validFrom),
      validUntil: parseDate(data.validUntil),
    },
  }));
});
adminRouter.patch("/promo-codes/:id", async (req, res) => {
  const data = promoCodeSchema.partial().parse(req.body);
  res.json(await prisma.promoCode.update({
    where: { id: req.params.id },
    data: {
      ...data,
      code: data.code?.toUpperCase(),
      validFrom: data.validFrom === undefined ? undefined : parseDate(data.validFrom),
      validUntil: data.validUntil === undefined ? undefined : parseDate(data.validUntil),
    },
  }));
});
adminRouter.delete("/promo-codes/:id", async (req, res) => {
  await prisma.promoCode.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.json({ deactivated: true });
});

adminRouter.get("/users", async (req, res) => {
  const { page, limit, q, includeDeleted } = usersQuerySchema.parse(req.query);
  const where = buildUserWhere(q, includeDeleted);
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { lastSeenAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);
  res.json({
    items: items.map(serializeUser),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
});

adminRouter.post("/users", async (req, res) => {
  const data = userCreateSchema.parse(req.body);
  const existing = await prisma.user.findUnique({
    where: { telegramId: data.telegramId },
    select: { id: true, deletedAt: true },
  });
  if (existing) {
    res.status(409).json({
      error: "User with this Telegram ID already exists.",
      existingUserId: existing.id,
      isDeleted: Boolean(existing.deletedAt),
    });
    return;
  }
  const language = await prisma.language.findUnique({ where: { code: data.languageCode } });
  if (!language) {
    res.status(400).json({ error: "Unknown language code." });
    return;
  }
  const category = await prisma.licenseCategory.findUnique({ where: { code: data.categoryCode } });
  if (!category) {
    res.status(400).json({ error: "Unknown category code." });
    return;
  }
  const now = new Date();
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        telegramId: data.telegramId,
        username: data.username ?? null,
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        languageCode: data.languageCode,
        firstSeenAt: now,
        lastSeenAt: now,
        interfaceLanguageId: language.id,
        selectedCategoryId: category.id,
        adminNote: data.adminNote ?? null,
      },
    });
    if (data.grantAccess) {
      const access = await tx.userAccess.create({
        data: {
          userId: created.id,
          source: "MANUAL_ADMIN",
          startsAt: now,
          expiresAt: data.grantAccess.isLifetime ? null : new Date(now.getTime() + ((data.grantAccess.accessDays ?? 1) * 24 * 60 * 60 * 1000)),
          isLifetime: data.grantAccess.isLifetime,
          isActive: true,
          internalNote: data.grantAccess.reason ?? null,
        },
      });
      await tx.userAccess.update({
        where: { id: access.id },
        data: { internalNote: data.grantAccess.reason ?? null },
      });
    }
    return created;
  });
  const createdUser = await loadUserRelations(user.id);
  res.status(201).json(serializeUser(createdUser ?? user));
});
adminRouter.get("/users/:id", async (req, res) => {
  const user = await loadUserRelations(req.params.id);
  if (!user) {
    res.status(404).json({ error: "User not found." });
    return;
  }
  const [savedCount, mistakeCount, questionStats, categoryProgress, topicProgress, latestSession] = await Promise.all([
    prisma.savedQuestion.count({ where: { userId: user.id } }),
    prisma.userMistake.count({ where: { userId: user.id, resolvedAt: null } }),
    prisma.userQuestionProgress.aggregate({
      where: { userId: user.id },
      _count: { _all: true },
    }),
    prisma.userQuestionProgress.findMany({
      where: { userId: user.id },
      distinct: ["licenseCategoryId"],
      select: { licenseCategoryId: true },
    }),
    prisma.userTopicProgress.findMany({
      where: { userId: user.id },
      include: { topic: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.quizSession.findFirst({
      where: { userId: user.id },
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        mode: true,
        category: { select: { code: true } },
        topic: { select: { slug: true } },
        totalQuestions: true,
        correctAnswers: true,
        wrongAnswers: true,
        startedAt: true,
        finishedAt: true,
        status: true,
      },
    }),
  ]);
  res.json({
    ...serializeUser(user),
    paymentOrders: user.paymentOrders.map(serializePaymentOrder),
    userAccesses: user.userAccesses,
    promoCodeUsages: user.promoCodeUsages.map((usage) => ({
      ...usage,
      promoCode: usage.promoCode,
    })),
    interfaceLanguage: user.interfaceLanguage?.code ?? "en",
    selectedCategory: user.selectedCategory?.code ?? "B",
    savedCount,
    mistakeCount,
    questionStats: {
      totalAnswers: questionStats._count._all ?? 0,
      correctAnswers: await prisma.userQuestionProgress.count({ where: { userId: user.id, isCorrect: true } }),
      wrongAnswers: await prisma.userQuestionProgress.count({ where: { userId: user.id, isCorrect: false } }),
    },
    categoryProgress: await Promise.all(
      categoryProgress.map(async (row) => {
        if (!row.licenseCategoryId) return null;
        const category = await prisma.licenseCategory.findUnique({
          where: { id: row.licenseCategoryId },
          select: { id: true, code: true, name: true },
        });
        if (!category) return null;
        const answeredQuestions = await prisma.userQuestionProgress.count({
          where: { userId: user.id, licenseCategoryId: row.licenseCategoryId },
        });
        const correctAnswers = await prisma.userQuestionProgress.count({
          where: { userId: user.id, licenseCategoryId: row.licenseCategoryId, isCorrect: true },
        });
        const totalQuestions = await prisma.question.count({ where: { categoryId: row.licenseCategoryId, isActive: true } });
        return {
          categoryId: category.id,
          categoryCode: category.code,
          categoryName: category.name,
          totalQuestions,
          answeredQuestions,
          correctAnswers,
          wrongAnswers: answeredQuestions - correctAnswers,
        };
      }),
    ).then((rows) => rows.filter(Boolean)),
    topicProgress,
    latestSession,
  });
});
adminRouter.delete("/users/:id", async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: { id: true, deletedAt: true },
  });
  if (!user) {
    res.status(404).json({ error: "User not found." });
    return;
  }
  if (user.deletedAt) {
    res.status(409).json({ error: "Already deleted." });
    return;
  }
  const now = new Date();
  const updatedUser = await prisma.$transaction(async (tx) => {
    await tx.userAccess.updateMany({
      where: { userId: req.params.id, revokedAt: null },
      data: { isActive: false, revokedAt: now, revokedByAdminId: null },
    });
    return tx.user.update({
      where: { id: req.params.id },
      data: { deletedAt: now },
    });
  });
  res.json({ ok: true, softDeleted: true, user: serializeUser(updatedUser) });
});
adminRouter.post("/users/:id/restore", async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: { id: true, deletedAt: true },
  });
  if (!user) {
    res.status(404).json({ error: "User not found." });
    return;
  }
  if (!user.deletedAt) {
    res.status(409).json({ error: "User is not deleted." });
    return;
  }
  const updatedUser = await prisma.user.update({
    where: { id: req.params.id },
    data: { deletedAt: null },
  });
  res.json({ ok: true, restored: true, user: serializeUser(updatedUser) });
});
adminRouter.delete("/users/:id/permanent", async (req, res) => {
  const { confirm } = hardDeleteSchema.parse(req.body);
  if (confirm !== "PERMANENTLY_DELETE") {
    res.status(400).json({ error: "Confirmation phrase required." });
    return;
  }
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: { id: true },
  });
  if (!user) {
    res.status(404).json({ error: "User not found." });
    return;
  }
  const paidOrders = await prisma.paymentOrder.count({ where: { userId: req.params.id, status: "PAID" } });
  if (paidOrders > 0) {
    res.status(409).json({ error: "Cannot permanently delete user with paid orders. Use soft delete instead." });
    return;
  }
  const quizSessionIds = await prisma.quizSession.findMany({
    where: { userId: req.params.id },
    select: { id: true },
  });
  await prisma.$transaction([
    prisma.userMistake.deleteMany({ where: { userId: req.params.id } }),
    prisma.savedQuestion.deleteMany({ where: { userId: req.params.id } }),
    prisma.userQuestionProgress.deleteMany({ where: { userId: req.params.id } }),
    prisma.userTopicProgress.deleteMany({ where: { userId: req.params.id } }),
    prisma.quizAnswer.deleteMany({ where: { quizSessionId: { in: quizSessionIds.map((session) => session.id) } } }),
    prisma.quizSession.deleteMany({ where: { userId: req.params.id } }),
    prisma.promoCodeUsage.deleteMany({ where: { userId: req.params.id } }),
    prisma.userAccess.deleteMany({ where: { userId: req.params.id } }),
    prisma.paymentOrder.deleteMany({ where: { userId: req.params.id } }),
    prisma.payment.deleteMany({ where: { userId: req.params.id } }),
    prisma.subscription.deleteMany({ where: { userId: req.params.id } }),
    prisma.user.delete({ where: { id: req.params.id } }),
  ]);
  // TODO: restrict hard delete to SUPER_ADMIN role when admin roles are introduced
  res.json({ ok: true, permanentlyDeleted: true });
});
adminRouter.post("/users/:id/grant-access", async (req, res) => {
  const data = userGrantSchema.parse(req.body);
  const access = await prisma.userAccess.create({
    data: {
      userId: req.params.id,
      productId: data.productId ?? null,
      source: "MANUAL_ADMIN",
      startsAt: new Date(),
      expiresAt: data.isLifetime ? null : new Date(Date.now() + ((data.accessDays ?? 1) * 24 * 60 * 60 * 1000)),
      isLifetime: data.isLifetime,
      isActive: true,
      internalNote: [data.reason, data.internalNote].filter(Boolean).join(" | ") || null,
    },
  });
  res.status(201).json(access);
});
adminRouter.post("/users/:id/revoke-access", async (req, res) => {
  const { accessId } = z.object({ accessId: z.string().cuid().optional() }).parse(req.body);
  const updated = await prisma.userAccess.updateMany({
    where: { userId: req.params.id, ...(accessId ? { id: accessId } : {}), revokedAt: null },
    data: { isActive: false, revokedAt: new Date(), revokedByAdminId: null },
  });
  res.json(updated);
});
adminRouter.patch("/users/:id/block", async (req, res) => {
  const { isBlocked, adminNote } = userBlockSchema.parse(req.body);
  res.json(serializeUser(await prisma.user.update({
    where: { id: req.params.id },
    data: {
      isBlocked,
      ...(adminNote !== undefined ? { adminNote } : {}),
    },
  })));
});

adminRouter.get("/orders", async (req, res) => {
  const status = String(req.query.status ?? "");
  const userId = String(req.query.userId ?? "");
  const from = String(req.query.from ?? "");
  const to = String(req.query.to ?? "");
  const orders = await prisma.paymentOrder.findMany({
    where: {
      ...(status ? { status: status as any } : {}),
      ...(userId ? { userId } : {}),
      ...(from || to ? { createdAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { user: true, product: true, promoCode: true },
    take: 250,
  });
  res.json(orders.map(serializePaymentOrder));
});

adminRouter.get("/banners", async (_req, res) => {
  res.json(await prisma.banner.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] }));
});
adminRouter.post("/banners", async (req, res) => {
  const data = bannerSchema.parse(req.body);
  res.status(201).json(await prisma.banner.create({
    data: {
      ...data,
      validFrom: parseDate(data.validFrom),
      validUntil: parseDate(data.validUntil),
    },
  }));
});
adminRouter.patch("/banners/:id", async (req, res) => {
  const data = bannerSchema.partial().parse(req.body);
  res.json(await prisma.banner.update({
    where: { id: req.params.id },
    data: {
      ...data,
      validFrom: data.validFrom === undefined ? undefined : parseDate(data.validFrom),
      validUntil: data.validUntil === undefined ? undefined : parseDate(data.validUntil),
    },
  }));
});
adminRouter.delete("/banners/:id", async (req, res) => {
  await prisma.banner.delete({ where: { id: req.params.id } });
  res.json({ deleted: true });
});

adminRouter.get("/promotions", async (_req, res) => {
  res.json(await prisma.promotion.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] }));
});
adminRouter.post("/promotions", async (req, res) => {
  const data = promotionSchema.parse(req.body);
  res.status(201).json(await prisma.promotion.create({
    data: {
      ...data,
      validFrom: parseDate(data.validFrom),
      validUntil: parseDate(data.validUntil),
    },
  }));
});
adminRouter.patch("/promotions/:id", async (req, res) => {
  const data = promotionSchema.partial().parse(req.body);
  res.json(await prisma.promotion.update({
    where: { id: req.params.id },
    data: {
      ...data,
      validFrom: data.validFrom === undefined ? undefined : parseDate(data.validFrom),
      validUntil: data.validUntil === undefined ? undefined : parseDate(data.validUntil),
    },
  }));
});
adminRouter.delete("/promotions/:id", async (req, res) => {
  await prisma.promotion.delete({ where: { id: req.params.id } });
  res.json({ deleted: true });
});

adminRouter.get("/news", async (_req, res) => {
  res.json(await prisma.news.findMany({ orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }, { createdAt: "desc" }] }));
});
adminRouter.post("/news", async (req, res) => {
  const data = newsSchema.parse(req.body);
  res.status(201).json(await prisma.news.create({
    data: {
      ...data,
      publishedAt: parseDate(data.publishedAt),
    },
  }));
});
adminRouter.patch("/news/:id", async (req, res) => {
  const data = newsSchema.partial().parse(req.body);
  res.json(await prisma.news.update({
    where: { id: req.params.id },
    data: {
      ...data,
      publishedAt: data.publishedAt === undefined ? undefined : parseDate(data.publishedAt),
    },
  }));
});
adminRouter.delete("/news/:id", async (req, res) => {
  await prisma.news.delete({ where: { id: req.params.id } });
  res.json({ deleted: true });
});

adminRouter.get("/settings", async (_req, res) => {
  res.json({
    adminTelegramIds: env.ADMIN_TELEGRAM_IDS.map(String),
  });
});
