import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { Observable, of, tap } from 'rxjs';
import { CacheService } from './cache.service';

export const CACHE_TTL_METADATA = 'cache:ttl';
export const CACHE_KEY_METADATA = 'cache:key';

/**
 * Decorate a controller method with @CacheResponse(ttl) to have its JSON
 * payload cached automatically. Falls through silently when Redis is degraded.
 */
export function CacheResponse(ttl = 60, key?: string) {
  return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(CACHE_TTL_METADATA, ttl, descriptor.value);
    if (key) Reflect.defineMetadata(CACHE_KEY_METADATA, key, descriptor.value);
    return descriptor;
  };
}

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  constructor(
    private readonly cache: CacheService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(ctx: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const request = ctx.switchToHttp().getRequest<Request>();

    // Only cache idempotent reads
    if (request.method !== 'GET') return next.handle();

    const handler = ctx.getHandler();
    const ttl = this.reflector.get<number>(CACHE_TTL_METADATA, handler);

    // Only cache routes decorated with @CacheResponse
    if (!ttl) return next.handle();

    const customKey = this.reflector.get<string>(CACHE_KEY_METADATA, handler);
    const cacheKey = customKey ?? this.buildKey(request);

    try {
      const cached = await this.cache.get(cacheKey);
      if (cached !== null) {
        this.logger.debug(`Cache HIT: ${cacheKey}`);
        const response = ctx.switchToHttp().getResponse<Response>();
        response.setHeader('X-Cache', 'HIT');
        return of(cached);
      }
    } catch {
      // Redis unavailable — serve live
      return next.handle();
    }

    return next.handle().pipe(
      tap(async (data) => {
        const stored = await this.cache.set(cacheKey, data, { ttl });
        if (stored) {
          this.logger.debug(`Cache SET: ${cacheKey} (ttl=${ttl}s)`);
          const response = ctx.switchToHttp().getResponse<Response>();
          response.setHeader('X-Cache', 'MISS');
        }
      }),
    );
  }

  private buildKey(req: Request): string {
    const qs = new URLSearchParams(req.query as Record<string, string>).toString();
    return `http:${req.path}${qs ? `?${qs}` : ''}`;
  }
}
