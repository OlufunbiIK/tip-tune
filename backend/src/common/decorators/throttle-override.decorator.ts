import { SetMetadata } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

/**
 * Custom throttle decorator with named presets for common rate limit scenarios
 */

// Throttle configuration presets
export const THROTTLE_PRESETS = {
  PUBLIC: { limit: 60, ttl: 60000 }, // 60 requests per minute
  AUTHENTICATED: { limit: 300, ttl: 60000 }, // 300 requests per minute
  AUTH_ENDPOINTS: { limit: 10, ttl: 60000 }, // 10 requests per minute (challenge, verify)
  TIP_SUBMISSION: { limit: 30, ttl: 60000 }, // 30 requests per minute
  SEARCH: { limit: 100, ttl: 60000 }, // 100 requests per minute
  FILE_UPLOAD: { limit: 5, ttl: 60000 }, // 5 requests per minute
  STRICT: { limit: 5, ttl: 60000 }, // 5 requests per minute (very strict)
  RELAXED: { limit: 1000, ttl: 60000 }, // 1000 requests per minute (relaxed)
} as const;

/**
 * Apply throttle override with preset configuration
 * 
 * @example
 * @ThrottleOverride('AUTH_ENDPOINTS')
 * async login() { ... }
 * 
 * @example
 * @ThrottleOverride('FILE_UPLOAD')
 * async uploadFile() { ... }
 */
export function ThrottleOverride(
  preset: keyof typeof THROTTLE_PRESETS,
): MethodDecorator {
  const config = THROTTLE_PRESETS[preset];
  return Throttle({ default: config });
}

/**
 * Apply custom throttle configuration
 * 
 * @example
 * @CustomThrottle(50, 60000) // 50 requests per minute
 * async customEndpoint() { ... }
 */
export function CustomThrottle(limit: number, ttl: number): MethodDecorator {
  return Throttle({ default: { limit, ttl } });
}

/**
 * Skip throttling for specific endpoint
 * 
 * @example
 * @SkipThrottle()
 * async healthCheck() { ... }
 */
export function SkipThrottle(): MethodDecorator {
  return Throttle({ default: { limit: 0, ttl: 0 } });
}

/**
 * Apply different throttle limits based on authentication status
 * This is a marker decorator - actual implementation in guard
 */
export const THROTTLE_AUTH_AWARE = 'throttle:auth-aware';
export function ThrottleAuthAware(): MethodDecorator {
  return SetMetadata(THROTTLE_AUTH_AWARE, true);
}
