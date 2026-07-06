import { RateLimiter } from './rateLimiter';
import config from '../config/config';

// Shared rate limiter for all providers hitting GeckoTerminal APIs
export const geckoTerminalRateLimiter = new RateLimiter(config.apiRateLimits.geckoTerminal);
