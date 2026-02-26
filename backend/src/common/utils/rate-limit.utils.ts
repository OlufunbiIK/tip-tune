import { Request } from 'express';

/**
 * Utility functions for rate limiting
 */

/**
 * Extract client IP from request, considering proxy headers
 */
export function getClientIp(request: Request): string {
  // Check X-Forwarded-For header (set by proxies)
  const forwarded = request.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return ips.split(',')[0].trim();
  }

  // Check X-Real-IP header (set by nginx)
  const realIp = request.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  // Fallback to request.ip
  return request.ip || request.socket.remoteAddress || 'unknown';
}

/**
 * Check if an IP address is in a whitelist
 */
export function isIpWhitelisted(ip: string, whitelist: string[]): boolean {
  return whitelist.some(
    (whitelistedIp) => ip === whitelistedIp || ip.startsWith(whitelistedIp),
  );
}

/**
 * Parse whitelist from environment variable
 */
export function parseWhitelist(whitelistEnv?: string): string[] {
  const defaultWhitelist = ['127.0.0.1', '::1', 'localhost'];
  
  if (!whitelistEnv) {
    return defaultWhitelist;
  }

  const customIps = whitelistEnv
    .split(',')
    .map(ip => ip.trim())
    .filter(Boolean);

  return [...defaultWhitelist, ...customIps];
}

/**
 * Calculate retry after time in seconds
 */
export function calculateRetryAfter(ttl: number): number {
  return Math.ceil(ttl / 1000);
}

/**
 * Format rate limit reset time as Unix timestamp
 */
export function formatResetTime(ttl: number): number {
  return Math.ceil((Date.now() + ttl) / 1000);
}

/**
 * Check if request is authenticated
 */
export function isRequestAuthenticated(request: any): boolean {
  return !!(
    request.user ||
    request.headers.authorization ||
    request.cookies?.access_token
  );
}

/**
 * Get rate limit key for Redis storage
 */
export function getRateLimitKey(
  endpoint: string,
  ip: string,
  userId?: string,
): string {
  const identifier = userId || ip;
  const timestamp = Math.floor(Date.now() / 60000); // 1-minute buckets
  return `throttler:${endpoint}:${identifier}:${timestamp}`;
}

/**
 * Parse rate limit from environment variable
 */
export function parseRateLimit(
  envValue: string | undefined,
  defaultValue: number,
): number {
  if (!envValue) {
    return defaultValue;
  }

  const parsed = parseInt(envValue, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Create rate limit error message
 */
export function createRateLimitMessage(retryAfter: number): string {
  if (retryAfter === 1) {
    return 'Rate limit exceeded. Please try again in 1 second.';
  }
  return `Rate limit exceeded. Please try again in ${retryAfter} seconds.`;
}

/**
 * Get rate limit info from response headers
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

export function parseRateLimitHeaders(headers: Record<string, string>): RateLimitInfo | null {
  const limit = headers['x-ratelimit-limit'];
  const remaining = headers['x-ratelimit-remaining'];
  const reset = headers['x-ratelimit-reset'];
  const retryAfter = headers['retry-after'];

  if (!limit || !remaining || !reset) {
    return null;
  }

  return {
    limit: parseInt(limit, 10),
    remaining: parseInt(remaining, 10),
    reset: parseInt(reset, 10),
    retryAfter: retryAfter ? parseInt(retryAfter, 10) : undefined,
  };
}

/**
 * Check if rate limit is close to being exceeded
 */
export function isRateLimitWarning(
  remaining: number,
  limit: number,
  threshold: number = 0.1,
): boolean {
  return remaining / limit <= threshold;
}

/**
 * Format rate limit for logging
 */
export function formatRateLimitLog(
  endpoint: string,
  ip: string,
  limit: number,
  remaining: number,
): string {
  return `[Rate Limit] ${endpoint} - IP: ${ip} - ${remaining}/${limit} remaining`;
}
