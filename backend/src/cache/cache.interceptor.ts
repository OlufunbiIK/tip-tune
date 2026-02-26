import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from './cache.service';
import { CACHE_TTL } from './cache.constants';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  constructor(private readonly cacheService: CacheService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();

    // Only cache GET requests
    if (request.method !== 'GET') return next.handle();

    const cacheKey = `http:${request.url}`;

    const cached = await this.cacheService.get(cacheKey);
    if (cached !== null) {
      this.logger.debug(`Cache HIT: ${cacheKey}`);
      return of(cached);
    }

    return next.handle().pipe(
      tap(async (response) => {
        await this.cacheService.set(cacheKey, response, CACHE_TTL.SHORT);
        this.logger.debug(`Cache SET: ${cacheKey}`);
      }),
    );
  }
}