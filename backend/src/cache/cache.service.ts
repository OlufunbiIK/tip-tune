import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';
import { CACHE_TTL, MEMORY_CACHE_MAX_ITEMS } from './cache.constants';
import { CacheLayer, CacheMetrics } from './cache.types';

@Injectable()
export class CacheService implements OnModuleInit {
  private readonly logger = new Logger(CacheService.name);
  private memoryCache = new Map<string, { value: any; expiresAt: number }>();
  private metrics = { hits: 0, misses: 0, memoryHits: 0, redisHits: 0 };

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  onModuleInit() {
    // Clean expired memory cache entries every minute
    setInterval(() => this.cleanMemoryCache(), 60_000);
  }

  async get<T>(key: string, layer: CacheLayer = CacheLayer.BOTH): Promise<T | null> {
    // 1. Check memory cache first
    if (layer !== CacheLayer.REDIS) {
      const memEntry = this.memoryCache.get(key);
      if (memEntry && memEntry.expiresAt > Date.now()) {
        this.metrics.hits++;
        this.metrics.memoryHits++;
        return memEntry.value as T;
      }
    }

    // 2. Check Redis
    if (layer !== CacheLayer.MEMORY) {
      try {
        const redisValue = await this.redis.get(key);
        if (redisValue) {
          this.metrics.hits++;
          this.metrics.redisHits++;
          const parsed = JSON.parse(redisValue) as T;
          // Populate memory cache
          this.setMemory(key, parsed, CACHE_TTL.MEDIUM);
          return parsed;
        }
      } catch (err) {
        this.logger.warn(`Redis get error for key ${key}: ${err.message}`);
      }
    }

    this.metrics.misses++;
    return null;
  }

  async set(
    key: string,
    value: any,
    ttl: number = CACHE_TTL.MEDIUM,
    layer: CacheLayer = CacheLayer.BOTH,
  ): Promise<void> {
    if (layer !== CacheLayer.REDIS) {
      this.setMemory(key, value, ttl);
    }

    if (layer !== CacheLayer.MEMORY) {
      try {
        await this.redis.setex(key, ttl, JSON.stringify(value));
      } catch (err) {
        this.logger.warn(`Redis set error for key ${key}: ${err.message}`);
      }
    }
  }

  async del(key: string): Promise<void> {
    this.memoryCache.delete(key);
    try {
      await this.redis.del(key);
    } catch (err) {
      this.logger.warn(`Redis del error for key ${key}: ${err.message}`);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    // Invalidate memory cache
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(pattern.replace('*', ''))) {
        this.memoryCache.delete(key);
      }
    }

    // Invalidate Redis
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.log(`Invalidated ${keys.length} Redis keys matching ${pattern}`);
      }
    } catch (err) {
      this.logger.warn(`Redis pattern invalidation error: ${err.message}`);
    }
  }

  async getOrSet<T>(
    key: string,
    loader: () => Promise<T>,
    ttl: number = CACHE_TTL.MEDIUM,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const value = await loader();
    await this.set(key, value, ttl);
    return value;
  }

  async wrap<T>(
    key: string,
    loader: () => Promise<T>,
    ttl: number = CACHE_TTL.MEDIUM,
  ): Promise<T> {
    return this.getOrSet(key, loader, ttl);
  }

  getMetrics(): CacheMetrics {
    const total = this.metrics.hits + this.metrics.misses;
    return {
      hits: this.metrics.hits,
      misses: this.metrics.misses,
      hitRate: total > 0 ? (this.metrics.hits / total) * 100 : 0,
      totalRequests: total,
      memoryUsage: this.memoryCache.size,
      keyCount: this.memoryCache.size,
    };
  }

  private setMemory(key: string, value: any, ttl: number): void {
    // Evict oldest if at capacity
    if (this.memoryCache.size >= MEMORY_CACHE_MAX_ITEMS) {
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }
    this.memoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttl * 1000,
    });
  }

  private cleanMemoryCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiresAt <= now) {
        this.memoryCache.delete(key);
      }
    }
  }
}