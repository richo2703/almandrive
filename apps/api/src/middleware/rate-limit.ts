import rateLimit from "express-rate-limit";

export const adminLoginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { error: "Too many login attempts. Please try again in 15 minutes." },
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});
