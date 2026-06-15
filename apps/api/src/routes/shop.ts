import crypto from "node:crypto";
import { Router } from "express";
import { prisma } from "@theorie-direkt/database";
import { z } from "zod";
import { getRequestLanguageCode } from "../services/request-context.js";
import { env } from "../config/env.js";

export const shopRouter = Router();

const promoApplySchema = z.object({
  code: z.string().trim().min(1),
  productId: z.string().cuid().optional(),
});

const createInvoiceSchema = z.object({
  productId: z.string().cuid(),
  promoCode: z.string().trim().optional().default(""),
});

function isActiveWindow(validFrom: Date | null, validUntil: Date | null) {
  const now = new Date();
  return (!validFrom || validFrom <= now) && (!validUntil || validUntil >= now);
}

async function getCurrentAccess(userId: string) {
  const access = await prisma.userAccess.findFirst({
    where: {
      userId,
      isActive: true,
      revokedAt: null,
      OR: [
        { isLifetime: true },
        { expiresAt: { gt: new Date() } },
      ],
    },
    include: { product: true },
    orderBy: [{ createdAt: "desc" }],
  });
  return access;
}

async function countPromoUses(promoCodeId: string, userId?: string) {
  return prisma.promoCodeUsage.count({
    where: {
      promoCodeId,
      ...(userId ? { userId } : {}),
    },
  });
}

function computeDiscount(productPrice: number, promo: {
  type: "FREE_ACCESS" | "PERCENT_DISCOUNT" | "FIXED_STARS_DISCOUNT";
  discountPercent: number | null;
  discountStars: number | null;
}) {
  if (promo.type === "FREE_ACCESS") return { discountStars: productPrice, finalStars: 0 };
  if (promo.type === "PERCENT_DISCOUNT") {
    const discountStars = Math.floor((productPrice * (promo.discountPercent ?? 0)) / 100);
    return { discountStars, finalStars: Math.max(1, productPrice - discountStars) };
  }
  const discountStars = promo.discountStars ?? 0;
  return { discountStars, finalStars: Math.max(1, productPrice - discountStars) };
}

async function resolvePromo(code: string, userId: string, productId?: string) {
  const promo = await prisma.promoCode.findUnique({ where: { code: code.toUpperCase() } });
  if (!promo || !promo.isActive) throw new Error("Invalid promo code.");
  if (promo.validFrom && promo.validFrom > new Date()) throw new Error("Promo code is not active yet.");
  if (promo.validUntil && promo.validUntil < new Date()) throw new Error("Promo code has expired.");

  const totalUses = await prisma.promoCodeUsage.count({ where: { promoCodeId: promo.id } });
  if (promo.maxUses !== null && promo.maxUses !== undefined && totalUses >= promo.maxUses) {
    throw new Error("Promo code usage limit reached.");
  }
  const userUses = await countPromoUses(promo.id, userId);
  if (promo.maxUsesPerUser !== null && promo.maxUsesPerUser !== undefined && userUses >= promo.maxUsesPerUser) {
    throw new Error("Promo code usage limit reached for this user.");
  }
  const product = productId ? await prisma.product.findUnique({ where: { id: productId } }) : null;
  if (productId && !product) throw new Error("Product not found.");
  return { promo, product };
}

async function grantAccess({
  userId,
  productId,
  paymentOrderId,
  promoCodeId,
  source,
  isLifetime,
  accessDays,
  note,
  revokedByAdminId,
}: {
  userId: string;
  productId?: string | null;
  paymentOrderId?: string | null;
  promoCodeId?: string | null;
  source: "PAYMENT" | "PROMO_CODE" | "MANUAL_ADMIN" | "MIGRATION";
  isLifetime: boolean;
  accessDays?: number | null;
  note?: string | null;
  revokedByAdminId?: string | null;
}) {
  const startsAt = new Date();
  const expiresAt = isLifetime
    ? null
    : new Date(Date.now() + (Math.max(1, accessDays ?? 1) * 24 * 60 * 60 * 1000));
  return prisma.userAccess.create({
    data: {
      userId,
      productId: productId ?? null,
      paymentOrderId: paymentOrderId ?? null,
      promoCodeId: promoCodeId ?? null,
      source,
      startsAt,
      expiresAt,
      isLifetime,
      isActive: true,
      internalNote: note ?? null,
      revokedByAdminId: revokedByAdminId ?? null,
    },
    include: { product: true },
  });
}

async function serializeActiveAccess(userId: string) {
  const access = await getCurrentAccess(userId);
  return {
    hasActiveAccess: Boolean(access),
    accessUntil: access?.expiresAt?.toISOString() ?? null,
    isLifetime: access?.isLifetime ?? false,
    source: access?.source ?? null,
    activeProductTitle: access?.product?.title ?? null,
  };
}

shopRouter.get("/products", async (_req, res) => {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { priceStars: "asc" }],
  });
  res.json(products);
});

shopRouter.get("/me/access", async (req, res) => {
  res.json(await serializeActiveAccess(req.userId!));
});

shopRouter.get("/banners", async (req, res) => {
  const languageCode = await getRequestLanguageCode(req.userId!);
  const banners = await prisma.banner.findMany({
    where: {
      isActive: true,
      OR: [{ languageCode: null }, { languageCode }, { languageCode: "all" }],
      AND: [
        { OR: [{ validFrom: null }, { validFrom: { lte: new Date() } }] },
        { OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }] },
      ],
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  res.json(banners);
});

shopRouter.get("/promotions", async (req, res) => {
  const languageCode = await getRequestLanguageCode(req.userId!);
  const promotions = await prisma.promotion.findMany({
    where: {
      isActive: true,
      OR: [{ languageCode: null }, { languageCode }, { languageCode: "all" }],
      AND: [
        { OR: [{ validFrom: null }, { validFrom: { lte: new Date() } }] },
        { OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }] },
      ],
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  res.json(promotions);
});

shopRouter.get("/news", async (req, res) => {
  const languageCode = await getRequestLanguageCode(req.userId!);
  const news = await prisma.news.findMany({
    where: {
      isPublished: true,
      OR: [{ languageCode: null }, { languageCode }, { languageCode: "all" }],
    },
    orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
  });
  res.json(news);
});

shopRouter.post("/promo-codes/apply", async (req, res) => {
  const { code, productId } = promoApplySchema.parse(req.body);
  const { promo, product } = await resolvePromo(code, req.userId!, productId);
  const access = await getCurrentAccess(req.userId!);
  if (promo.type === "FREE_ACCESS") {
    const createdAccess = await grantAccess({
      userId: req.userId!,
      productId: product?.id ?? null,
      promoCodeId: promo.id,
      source: "PROMO_CODE",
      isLifetime: promo.isLifetime,
      accessDays: promo.accessDays,
      note: `Promo code ${promo.code}`,
    });
    await prisma.promoCodeUsage.create({
      data: {
        promoCodeId: promo.id,
        userId: req.userId!,
        userAccessId: createdAccess.id,
        discountStarsApplied: 0,
      },
    });
    res.json({
      promoCode: promo.code,
      isFreeAccess: true,
      hasActiveAccess: Boolean(access || createdAccess),
      accessUntil: createdAccess.expiresAt?.toISOString() ?? null,
      isLifetime: createdAccess.isLifetime,
      source: createdAccess.source,
      activeProductTitle: createdAccess.product?.title ?? product?.title ?? null,
    });
    return;
  }
  if (!product) {
    res.status(400).json({ error: "Product is required for discount promo codes." });
    return;
  }
  const { discountStars, finalStars } = computeDiscount(product.priceStars, promo);
  res.json({
    promoCode: promo.code,
    isFreeAccess: false,
    discountStars,
    finalStars,
    productId: product.id,
    productTitle: product.title,
  });
});

shopRouter.post("/payments/create-invoice", async (req, res) => {
  const { productId, promoCode } = createInvoiceSchema.parse(req.body);
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || !product.isActive) {
    res.status(400).json({ error: "Inactive or missing product." });
    return;
  }

  let promo: Awaited<ReturnType<typeof resolvePromo>> | null = null;
  let discountStars = 0;
  let finalStars = product.priceStars;
  if (promoCode) {
    promo = await resolvePromo(promoCode, req.userId!, productId);
    if (promo.promo.type === "FREE_ACCESS") {
      const createdAccess = await grantAccess({
        userId: req.userId!,
        productId: product.id,
        promoCodeId: promo.promo.id,
        source: "PROMO_CODE",
        isLifetime: promo.promo.isLifetime,
        accessDays: promo.promo.accessDays,
        note: `Promo code ${promo.promo.code}`,
      });
      await prisma.promoCodeUsage.create({
        data: {
          promoCodeId: promo.promo.id,
          userId: req.userId!,
          userAccessId: createdAccess.id,
          discountStarsApplied: product.priceStars,
        },
      });
      res.json({
        freeAccess: true,
        accessUntil: createdAccess.expiresAt?.toISOString() ?? null,
        isLifetime: createdAccess.isLifetime,
      });
      return;
    }
    const result = computeDiscount(product.priceStars, promo.promo);
    discountStars = result.discountStars;
    finalStars = result.finalStars;
  }

  if (!env.TELEGRAM_BOT_TOKEN) {
    res.status(503).json({ error: "TELEGRAM_BOT_TOKEN is not configured." });
    return;
  }
  const order = await prisma.paymentOrder.create({
    data: {
      userId: req.userId!,
      productId: product.id,
      promoCodeId: promo?.promo.id ?? null,
      amountStarsOriginal: product.priceStars,
      discountStars,
      amountStarsFinal: finalStars,
      status: "PENDING",
      payload: `order:${crypto.randomUUID()}`,
    },
  });

  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/createInvoiceLink`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: product.title,
        description: product.description ?? product.title,
        payload: order.payload,
        provider_token: "",
      currency: "XTR",
      prices: [{ label: product.title, amount: finalStars }],
    }),
  });
  const payload = await response.json() as { ok: boolean; result?: string; description?: string };
  if (!payload.ok || !payload.result) {
    await prisma.paymentOrder.update({
      where: { id: order.id },
      data: { status: "FAILED" },
    });
    res.status(500).json({ error: payload.description ?? "Failed to create invoice." });
    return;
  }

  if (promo?.promo && promo.promo.type !== "FREE_ACCESS") {
    await prisma.promoCodeUsage.create({
      data: {
        promoCodeId: promo.promo.id,
        userId: req.userId!,
        paymentOrderId: order.id,
        discountStarsApplied: discountStars,
      },
    });
  }

  res.json({
    orderId: order.id,
    payload: order.payload,
    invoiceLink: payload.result,
    amountStarsOriginal: product.priceStars,
    discountStars,
    amountStarsFinal: finalStars,
  });
});
