import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CacheService } from './cache.service';
import { CACHE_TTL } from './cache.constants';

@Injectable()
export class CacheMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CacheMiddleware.name);

  constructor(private readonly cacheService: CacheService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    if (req.method !== 'GET') return next();

    const key = `mw:${req.originalUrl}`;
    const cached = await this.cacheService.get<string>(key);

    if (cached) {
      this.logger.debug(`Middleware cache HIT: ${key}`);
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Content-Type', 'application/json');
      return res.send(cached);
    }

    const originalSend = res.send.bind(res);
    res.send = (body: any) => {
      if (res.statusCode === 200) {
        this.cacheService.set(key, body, CACHE_TTL.SHORT).catch((err) =>
          this.logger.warn(`Failed to cache response: ${err.message}`),
        );
      }
      res.setHeader('X-Cache', 'MISS');
      return originalSend(body);
    };

    next();
  }
}