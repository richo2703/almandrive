import type { ApiQuestion } from "@theorie-direkt/shared";

export const API_URL =
  import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:4000" : window.location.origin);

let authToken = localStorage.getItem("theorie-token");

export class ApiError extends Error {
  status: number;
  code?: string;
  data?: unknown;

  constructor(message: string, status: number, code?: string, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(body.message ?? body.error ?? `Request failed (${response.status})`, response.status, body.code, body);
  return body as T;
}

export async function authenticate(initData: string) {
  const result = await request<{
    token: string;
    user: { firstName: string | null; category: string; interfaceLanguage: string; isAdmin: boolean };
  }>("/api/auth/telegram", {
    method: "POST",
    body: JSON.stringify({ initData }),
  });
  authToken = result.token;
  localStorage.setItem("theorie-token", result.token);
  return result.user;
}

export const api = {
  me: () => request<UserProfile>("/api/me"),
  meProfile: () => request<UserProfile>("/api/me/profile"),
  meProgress: () => request<UserProgress>("/api/me/progress"),
  meStatistics: () => request<Statistics>("/api/me/statistics"),
  meMistakes: () => request<ApiQuestion[]>("/api/me/mistakes"),
  meSaved: () => request<ApiQuestion[]>("/api/me/saved"),
  languages: () => request<Language[]>("/api/languages"),
  categories: () => request<Category[]>("/api/categories"),
  topics: () => request<Topic[]>("/api/topics"),
  nextQuestion: (category: string, topic?: string) =>
    request<ApiQuestion>(
      `/api/questions/next?category=${encodeURIComponent(category)}${topic ? `&topic=${encodeURIComponent(topic)}` : ""}`,
    ),
  question: (id: string) => request<ApiQuestion>(`/api/questions/${id}`),
  answer: (id: string, optionIds: string[]) =>
    request<AnswerResult>(`/api/questions/${id}/answer`, {
      method: "POST",
      body: JSON.stringify({ optionIds }),
    }),
  bookmark: (id: string, bookmarked?: boolean) =>
    request<{ bookmarked: boolean }>(`/api/questions/${id}/bookmark`, {
      method: "POST",
      body: JSON.stringify({ bookmarked }),
    }),
  saveQuestion: (id: string) =>
    request<{ saved: boolean }>(`/api/questions/${id}/save`, { method: "POST" }),
  unsaveQuestion: (id: string) =>
    request<{ saved: boolean }>(`/api/questions/${id}/save`, { method: "DELETE" }),
  resolveMistake: (id: string) =>
    request<{ resolved: boolean }>(`/api/mistakes/${id}/resolve`, { method: "POST" }),
  mistakes: () => request<ApiQuestion[]>("/api/mistakes"),
  bookmarks: () => request<ApiQuestion[]>("/api/bookmarks"),
  statistics: () => request<Statistics>("/api/statistics"),
  preferences: (values: { language?: string; category?: string }) =>
    request<{ language: string; category: string }>("/api/profile/preferences", {
      method: "PATCH",
      body: JSON.stringify(values),
    }),
  startExam: (category: string, questionCount = 30) =>
    request<{ id: string; totalQuestions: number; question: ApiQuestion }>("/api/exam/start", {
      method: "POST",
      body: JSON.stringify({ category, questionCount }),
    }),
  startQuizSession: (payload: {
    category: string;
    questionCount?: number;
    topic?: string;
    mode?: "PRACTICE" | "EXAM" | "MISTAKES" | "SAVED";
    questionIds?: string[];
  }) =>
    request<{ id: string; totalQuestions: number; question: ApiQuestion }>("/api/quiz-sessions/start", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  answerExam: (examId: string, questionId: string, optionIds: string[]) =>
    request<SessionAnswerResult>(
      `/api/exam/${examId}/answer`,
      { method: "POST", body: JSON.stringify({ questionId, optionIds }) },
    ),
  answerQuizSession: (sessionId: string, questionId: string, optionIds: string[]) =>
    request<SessionAnswerResult>(
      `/api/quiz-sessions/${sessionId}/answer`,
      { method: "POST", body: JSON.stringify({ questionId, optionIds }) },
    ),
  finishExam: (examId: string) =>
    request<{ score: number; totalQuestions: number; percentage: number }>(
      `/api/exam/${examId}/finish`,
      { method: "POST" },
    ),
  finishQuizSession: (sessionId: string) =>
    request<{ score: number; totalQuestions: number; percentage: number }>(
      `/api/quiz-sessions/${sessionId}/finish`,
      { method: "POST" },
    ),
  products: () => request<Product[]>("/api/products"),
  access: () => request<AccessStatus>("/api/me/access"),
  applyPromoCode: (code: string, productId?: string) =>
    request<PromoApplyResult>("/api/promo-codes/apply", {
      method: "POST",
      body: JSON.stringify({ code, productId }),
    }),
  createInvoice: (productId: string, promoCode = "") =>
    request<CreateInvoiceResult>("/api/payments/create-invoice", {
      method: "POST",
      body: JSON.stringify({ productId, promoCode }),
    }),
  banners: () => request<Banner[]>("/api/banners"),
  promotions: () => request<Promotion[]>("/api/promotions"),
  news: () => request<NewsItem[]>("/api/news"),
  adminLogin: (username: string, password: string) => request<AdminAuthResult>("/api/admin/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  adminLogout: () => request<{ ok: boolean }>("/api/admin/logout", { method: "POST" }),
  adminMe: () => request<AdminAuthResult>("/api/admin/me"),
  adminDashboard: () => request<AdminDashboard>("/api/admin/dashboard"),
  adminProducts: () => request<Product[]>("/api/admin/products"),
  adminCreateProduct: (payload: Partial<ProductInput>) =>
    request<Product>("/api/admin/products", { method: "POST", body: JSON.stringify(payload) }),
  adminUpdateProduct: (id: string, payload: Partial<ProductInput>) =>
    request<Product>(`/api/admin/products/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  adminDeleteProduct: (id: string) =>
    request<{ deleted?: boolean; deactivated?: boolean; product?: Product }>(`/api/admin/products/${id}`, {
      method: "DELETE",
    }),
  adminPromoCodes: () => request<PromoCode[]>("/api/admin/promo-codes"),
  adminCreatePromoCode: (payload: Partial<PromoCodeInput>) =>
    request<PromoCode>("/api/admin/promo-codes", { method: "POST", body: JSON.stringify(payload) }),
  adminUpdatePromoCode: (id: string, payload: Partial<PromoCodeInput>) =>
    request<PromoCode>(`/api/admin/promo-codes/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  adminDeletePromoCode: (id: string) =>
    request<{ deactivated: boolean }>(`/api/admin/promo-codes/${id}`, { method: "DELETE" }),
  adminUsers: (params: { q?: string; page?: number; limit?: number; includeDeleted?: boolean } = {}) => {
    const search = new URLSearchParams();
    if (params.q) search.set("q", params.q);
    if (params.page) search.set("page", String(params.page));
    if (params.limit) search.set("limit", String(params.limit));
    if (params.includeDeleted) search.set("includeDeleted", "true");
    return request<AdminUsersResponse>(`/api/admin/users${search.toString() ? `?${search.toString()}` : ""}`);
  },
  adminUser: (id: string) => request<UserDetail>(`/api/admin/users/${id}`),
  adminCreateUser: (payload: CreateUserInput) =>
    request<UserDetail>("/api/admin/users", { method: "POST", body: JSON.stringify(payload) }),
  adminDeleteUser: (id: string) =>
    request<{ ok: boolean; softDeleted: boolean; user: UserRecord }>(`/api/admin/users/${id}`, { method: "DELETE" }),
  adminRestoreUser: (id: string) =>
    request<{ ok: boolean; restored: boolean; user: UserRecord }>(`/api/admin/users/${id}/restore`, { method: "POST" }),
  adminDeleteUserPermanent: (id: string) =>
    request<{ ok: boolean; permanentlyDeleted: boolean }>(`/api/admin/users/${id}/permanent`, {
      method: "DELETE",
      body: JSON.stringify({ confirm: "PERMANENTLY_DELETE" }),
    }),
  adminMetaLanguages: () => request<Language[]>("/api/admin/meta/languages"),
  adminMetaCategories: () => request<Category[]>("/api/admin/meta/categories"),
  adminGrantAccess: (id: string, payload: GrantAccessInput) =>
    request<UserAccess>(`/api/admin/users/${id}/grant-access`, { method: "POST", body: JSON.stringify(payload) }),
  adminRevokeAccess: (id: string, payload: { accessId?: string }) =>
    request<{ count: number }>(`/api/admin/users/${id}/revoke-access`, { method: "POST", body: JSON.stringify(payload) }),
  adminBlockUser: (id: string, isBlocked: boolean, adminNote?: string | null) =>
    request<UserRecord>(`/api/admin/users/${id}/block`, { method: "PATCH", body: JSON.stringify({ isBlocked, adminNote }) }),
  adminOrders: (filters: { status?: string; userId?: string; from?: string; to?: string; minAmount?: string; maxAmount?: string; promoCode?: string } = {}) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, value);
    }
    return request<PaymentOrder[]>(`/api/admin/orders${params.toString() ? `?${params.toString()}` : ""}`);
  },
  adminUpdateOrderStatus: (id: string, status: "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "CANCELLED") =>
    request<PaymentOrder>(`/api/admin/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  adminBanners: () => request<Banner[]>("/api/admin/banners"),
  adminCreateBanner: (payload: Partial<BannerInput>) =>
    request<Banner>("/api/admin/banners", { method: "POST", body: JSON.stringify(payload) }),
  adminUpdateBanner: (id: string, payload: Partial<BannerInput>) =>
    request<Banner>(`/api/admin/banners/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  adminDeleteBanner: (id: string) =>
    request<{ deleted: boolean }>(`/api/admin/banners/${id}`, { method: "DELETE" }),
  adminPromotions: () => request<Promotion[]>("/api/admin/promotions"),
  adminCreatePromotion: (payload: Partial<PromotionInput>) =>
    request<Promotion>("/api/admin/promotions", { method: "POST", body: JSON.stringify(payload) }),
  adminUpdatePromotion: (id: string, payload: Partial<PromotionInput>) =>
    request<Promotion>(`/api/admin/promotions/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  adminDeletePromotion: (id: string) =>
    request<{ deleted: boolean }>(`/api/admin/promotions/${id}`, { method: "DELETE" }),
  adminNews: () => request<NewsItem[]>("/api/admin/news"),
  adminCreateNews: (payload: Partial<NewsInput>) =>
    request<NewsItem>("/api/admin/news", { method: "POST", body: JSON.stringify(payload) }),
  adminUpdateNews: (id: string, payload: Partial<NewsInput>) =>
    request<NewsItem>(`/api/admin/news/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  adminDeleteNews: (id: string) =>
    request<{ deleted: boolean }>(`/api/admin/news/${id}`, { method: "DELETE" }),
  adminSettings: () => request<{ adminTelegramIds: string[] }>("/api/admin/settings"),
};

export async function adminUploadImage(file: File, category: "banners" | "promotions" | "news") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("category", category);
  const response = await fetch(`${API_URL}/api/admin/upload`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(body.message ?? body.error ?? `Request failed (${response.status})`, response.status, body.code, body);
  }
  return body as { url: string; filename: string };
}

export interface Language {
  id: string;
  code: string;
  name: string;
  nativeName: string;
  isContentActive: boolean;
  isInterfaceActive: boolean;
  isRtl: boolean;
}

export interface Category {
  id: string;
  code: string;
  name: string;
  description: string | null;
}

export interface Topic {
  id: string;
  slug: string;
  name: string;
}

export interface AnswerResult {
  isCorrect: boolean;
  correctOptionIds: string[];
  explanation: string | null;
}

export interface SessionAnswerResult extends AnswerResult {
  saved: boolean;
  currentIndex: number;
  nextQuestion: ApiQuestion | null;
}

export interface Statistics {
  totalAnswers: number;
  correctAnswers: number;
  accuracy: number;
  questionsSeen: number;
  bookmarks: number;
  mistakes: number;
  wrongAnswers?: number;
  access?: AccessStatus;
  recentExams: Array<{
    id: string;
    score: number;
    totalQuestions: number;
    finishedAt: string;
    category: { code: string };
  }>;
}

export interface UserProfile {
  user: {
    telegramId: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    languageCode: string | null;
    photoUrl: string | null;
    interfaceLanguage: string;
    selectedCategory: string;
    firstSeenAt: string;
    lastSeenAt: string;
    isBlocked: boolean;
    isAdmin: boolean;
    adminNote: string | null;
  };
  access: AccessStatus;
  statistics: Statistics;
  savedCount: number;
  mistakeCount: number;
  completedTopics: number;
  completedCategories: number;
  categoryProgress: Array<{
    categoryId: string;
    categoryCode: string;
    categoryName: string;
    totalQuestions: number;
    answeredQuestions: number;
    correctAnswers: number;
    wrongAnswers: number;
    completed: boolean;
  }>;
  topicProgress: Array<{
    topicId: string;
    topicSlug: string;
    topicName: string;
    totalQuestions: number;
    answeredQuestions: number;
    correctAnswers: number;
    wrongAnswers: number;
    completedAt: string | null;
  }>;
}

export interface UserProgress extends UserProfile {
  lastSession: {
    id: string;
    mode: "PRACTICE" | "EXAM" | "MISTAKES" | "SAVED";
    category: { code: string };
    topic: { id: string; slug: string } | null;
    questionIds: string[];
    score: number | null;
    totalQuestions: number;
    startedAt: string;
    finishedAt: string | null;
  } | null;
  lastQuestionId: string | null;
  lastTopicId: string | null;
  lastCategoryId: string | null;
  lastAnsweredAt: string | null;
}

export interface Product {
  id: string;
  title: string;
  description: string | null;
  priceStars: number;
  accessDays: number | null;
  isLifetime: boolean;
  isActive: boolean;
  sortOrder: number;
  badgeText: string | null;
  oldPriceStars: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccessStatus {
  hasActiveAccess: boolean;
  accessUntil: string | null;
  isLifetime: boolean;
  source: "PAYMENT" | "PROMO_CODE" | "MANUAL_ADMIN" | "MIGRATION" | null;
  activeProductTitle: string | null;
}

export interface PromoCode {
  id: string;
  code: string;
  type: "FREE_ACCESS" | "PERCENT_DISCOUNT" | "FIXED_STARS_DISCOUNT";
  discountPercent: number | null;
  discountStars: number | null;
  accessDays: number | null;
  isLifetime: boolean;
  maxUses: number | null;
  maxUsesPerUser: number | null;
  validFrom: string | null;
  validUntil: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  usages?: Array<{
    id: string;
    usedAt: string;
    discountStarsApplied: number;
    user: UserRecord;
  }>;
}

export interface UserRecord {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  languageCode: string | null;
  photoUrl: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  isBlocked: boolean;
  isAdmin: boolean;
  adminNote: string | null;
  deletedAt: string | null;
  selectedCategoryId: string | null;
  interfaceLanguageId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserAccess {
  id: string;
  userId: string;
  productId: string | null;
  paymentOrderId: string | null;
  promoCodeId: string | null;
  source: "PAYMENT" | "PROMO_CODE" | "MANUAL_ADMIN" | "MIGRATION";
  startsAt: string;
  expiresAt: string | null;
  isLifetime: boolean;
  isActive: boolean;
  revokedAt: string | null;
  revokedByAdminId: string | null;
  internalNote: string | null;
  createdAt: string;
  updatedAt: string;
  product?: Product | null;
}

export interface PaymentOrder {
  id: string;
  userId: string;
  productId: string;
  promoCodeId: string | null;
  amountStarsOriginal: number;
  discountStars: number;
  amountStarsFinal: number;
  status: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  payload: string;
  telegramPaymentChargeId: string | null;
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
  user?: UserRecord;
  product?: Product;
  promoCode?: PromoCode | null;
}

export interface PromoCodeInput {
  code: string;
  type: "FREE_ACCESS" | "PERCENT_DISCOUNT" | "FIXED_STARS_DISCOUNT";
  discountPercent: number | null;
  discountStars: number | null;
  accessDays: number | null;
  isLifetime: boolean;
  maxUses: number | null;
  maxUsesPerUser: number | null;
  validFrom: string | null;
  validUntil: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface GrantAccessInput {
  accessDays?: number | null;
  isLifetime: boolean;
  reason?: string | null;
  internalNote?: string | null;
  productId?: string | null;
}

export interface ProductInput {
  title: string;
  description: string | null;
  priceStars: number;
  accessDays: number | null;
  isLifetime: boolean;
  isActive: boolean;
  sortOrder: number;
  badgeText: string | null;
  oldPriceStars: number | null;
}

export interface Banner {
  id: string;
  imageUrl: string | null;
  title: string;
  subtitle: string | null;
  buttonText: string | null;
  buttonUrl: string | null;
  placement: "HOME_TOP" | "HOME_MIDDLE" | "PRICING_TOP" | "QUIZ_BOTTOM" | "LEARN_TOP";
  languageCode: string | null;
  isActive: boolean;
  sortOrder: number;
  validFrom: string | null;
  validUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BannerInput {
  imageUrl: string | null;
  title: string;
  subtitle: string | null;
  buttonText: string | null;
  buttonUrl: string | null;
  placement: Banner["placement"];
  languageCode: string | null;
  isActive: boolean;
  sortOrder: number;
  validFrom: string | null;
  validUntil: string | null;
}

export interface Promotion {
  id: string;
  imageUrl: string | null;
  title: string;
  description: string | null;
  buttonText: string | null;
  buttonUrl: string | null;
  linkedProductId: string | null;
  promoCodeId: string | null;
  languageCode: string | null;
  isActive: boolean;
  validFrom: string | null;
  validUntil: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PromotionInput {
  imageUrl: string | null;
  title: string;
  description: string | null;
  buttonText: string | null;
  buttonUrl: string | null;
  linkedProductId: string | null;
  promoCodeId: string | null;
  languageCode: string | null;
  isActive: boolean;
  validFrom: string | null;
  validUntil: string | null;
  sortOrder: number;
}

export interface NewsItem {
  id: string;
  title: string;
  excerpt: string | null;
  body: string;
  imageUrl: string | null;
  languageCode: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface NewsInput {
  title: string;
  excerpt: string | null;
  body: string;
  imageUrl: string | null;
  languageCode: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  sortOrder: number;
}

export interface PromoApplyResult {
  promoCode: string;
  isFreeAccess: boolean;
  hasActiveAccess?: boolean;
  accessUntil?: string | null;
  isLifetime?: boolean;
  source?: string | null;
  activeProductTitle?: string | null;
  discountStars?: number;
  finalStars?: number;
  productId?: string;
  productTitle?: string;
}

export interface CreateInvoiceResult {
  orderId: string;
  payload: string;
  invoiceLink: string;
  amountStarsOriginal: number;
  discountStars: number;
  amountStarsFinal: number;
}

export interface AdminAuthResult {
  ok: boolean;
  username: string;
}

export interface AdminUsersResponse {
  items: UserRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateUserInput {
  telegramId: number | string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  languageCode?: string;
  categoryCode?: string;
  adminNote?: string | null;
  grantAccess?: {
    accessDays?: number | null;
    isLifetime: boolean;
    reason?: string | null;
  } | null;
}

export interface AdminDashboard {
  totalUsers: number;
  activeSubscribers: number;
  revenueStars: number;
  ordersToday: number;
  ordersMonth: number;
  activePromoCodes: number;
  activeBanners: number;
  recentOrders: PaymentOrder[];
  recentUsers: UserRecord[];
  adminTelegramIds: string[];
}

export interface UserDetail extends UserRecord {
  paymentOrders: PaymentOrder[];
  userAccesses: UserAccess[];
  promoCodeUsages: Array<{
    id: string;
    usedAt: string;
    discountStarsApplied: number;
    promoCode: PromoCode;
  }>;
  interfaceLanguage: string;
  selectedCategory: string;
  savedCount: number;
  mistakeCount: number;
  questionStats: {
    totalAnswers: number;
    correctAnswers: number;
    wrongAnswers: number;
  };
  categoryProgress: Array<{
    categoryId: string;
    categoryCode: string;
    categoryName: string;
    totalQuestions: number;
    answeredQuestions: number;
    correctAnswers: number;
    wrongAnswers: number;
  }>;
  topicProgress: Array<{
    id: string;
    userId: string;
    topicId: string;
    totalQuestions: number;
    answeredQuestions: number;
    correctAnswers: number;
    wrongAnswers: number;
    completedAt: string | null;
    updatedAt: string;
    createdAt: string;
    topic: { id: string; slug: string };
  }>;
  latestSession: {
    id: string;
    mode: "PRACTICE" | "EXAM" | "MISTAKES" | "SAVED";
    category: { code: string };
    topic: { slug: string } | null;
    totalQuestions: number;
    correctAnswers: number;
    wrongAnswers: number;
    startedAt: string;
    finishedAt: string | null;
    status: string;
  } | null;
}
