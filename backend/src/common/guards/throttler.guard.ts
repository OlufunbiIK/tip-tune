import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { THROTTLE_AUTH_AWARE } from '../decorators/throttle-override.decorator';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  /**
   * Custom throttler guard that adds rate limit headers and whitelist support
   */
  
  constructor(
    options: any,
    storageService: any,
    private readonly reflector: Reflector,
  ) {
    super(options, storageService, reflector);
  }

  // Whitelist of IPs that bypass rate limiting (internal services, monitoring, etc.)
  private readonly whitelistedIPs = [
    '127.0.0.1',
    '::1',
    'localhost',
    // Add your internal service IPs here
    ...(process.env.RATE_LIMIT_WHITELIST?.split(',').filter(Boolean) || []),
  ];

  protected async handleRequest(
    context: ExecutionContext,
    limit: number,
    ttl: number,
    throttler: any,
  ): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Check if IP is whitelisted
    const clientIp = this.getClientIp(request);
    if (this.isWhitelisted(clientIp)) {
      // Set headers indicating unlimited access
      response.setHeader('X-RateLimit-Limit', 'unlimited');
      response.setHeader('X-RateLimit-Remaining', 'unlimited');
      response.setHeader('X-RateLimit-Reset', 'never');
      return true;
    }

    // Check if endpoint is auth-aware and adjust limits
    const isAuthAware = this.reflector.getAllAndOverride<boolean>(
      THROTTLE_AUTH_AWARE,
      [context.getHandler(), context.getClass()],
    );

    if (isAuthAware && this.isAuthenticated(request)) {
      // Increase limit for authenticated users
      limit = 300; // Authenticated rate limit
      ttl = 60000; // 1 minute
    }

    try {
      // Call parent implementation to check rate limit
      const result = await super.handleRequest(context, limit, ttl, throttler);
      
      // Add rate limit headers on successful requests
      this.addRateLimitHeaders(response, limit, ttl);
      
      return result;
    } catch (error) {
      // Add rate limit headers on rate limit exceeded
      this.addRateLimitHeaders(response, limit, ttl, true);
      
      // Add Retry-After header (in seconds)
      const retryAfter = Math.ceil(ttl / 1000);
      response.setHeader('Retry-After', retryAfter.toString());
      
      // Throw custom error with more details
      throw new ThrottlerException(
        `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
      );
    }
  }

  /**
   * Check if request is authenticated
   */
  private isAuthenticated(request: any): boolean {
    return !!(request.user || request.headers.authorization);
  }

  /**
   * Add rate limit headers to response
   */
  private addRateLimitHeaders(
    response: Response,
    limit: number,
    ttl: number,
    isExceeded = false,
  ): void {
    const resetTime = Date.now() + ttl;
    const remaining = isExceeded ? 0 : limit - 1; // Simplified, actual remaining would need tracker state

    response.setHeader('X-RateLimit-Limit', limit.toString());
    response.setHeader('X-RateLimit-Remaining', remaining.toString());
    response.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());
  }

  /**
   * Extract client IP from request
   */
  private getClientIp(request: Request): string {
    // Check common proxy headers
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
      return ips.split(',')[0].trim();
    }

    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    return request.ip || request.socket.remoteAddress || 'unknown';
  }

  /**
   * Check if IP is whitelisted
   */
  private isWhitelisted(ip: string): boolean {
    return this.whitelistedIPs.some(
      (whitelistedIp) => ip === whitelistedIp || ip.startsWith(whitelistedIp),
    );
  }
}
