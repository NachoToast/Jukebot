import rateLimit, { type RateLimitRequestHandler } from "express-rate-limit";
import { config } from "@/config";

export const rateLimiter: RateLimitRequestHandler = rateLimit({
	windowMs: 60 * 1000,
	max: config.api.maxRequestsPerMinute,
	standardHeaders: true,
	legacyHeaders: false,
});
