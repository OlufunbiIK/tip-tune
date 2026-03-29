import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants';

export interface CacheSetOptions {
  /** Time-to-live in seconds. Omit for no expiry. */
  ttl?: number;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  errors: number;
  degraded: boolean;
}

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);

  private _hits = 0;
  private _misses = 0;
  private _errors = 0;

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  // ---------------------------------------------------------------------------
  // Core operations
  // ---------------------------------------------------------------------------

  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(key);
      if (raw === null) {
        this._misses++;
        return null;
      }
      this._hits++;
      return JSON.parse(raw) as T;
    } catch (err) {
      this._errors++;
      this.logger.warn(`Cache GET failed for key "${key}": ${(err as Error).message}`);
      return null; // degrade gracefully
    }
  }

  async set<T = unknown>(
    key: string,
    value: T,
    options?: CacheSetOptions,
  ): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      if (options?.ttl) {
        await this.redis.set(key, serialized, 'EX', options.ttl);
      } else {
        await this.redis.set(key, serialized);
      }
      return true;
    } catch (err) {
      this._errors++;
      this.logger.warn(`Cache SET failed for key "${key}": ${(err as Error).message}`);
      return false; // degrade gracefully
    }
  }

  async del(...keys: string[]): Promise<number> {
    try {
      return await this.redis.del(...keys);
    } catch (err) {
      this._errors++;
      this.logger.warn(`Cache DEL failed for keys [${keys.join(', ')}]: ${(err as Error).message}`);
      return 0;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const count = await this.redis.exists(key);
      return count > 0;
    } catch (err) {
      this._errors++;
      this.logger.warn(`Cache EXISTS failed for key "${key}": ${(err as Error).message}`);
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key);
    } catch (err) {
      this._errors++;
      this.logger.warn(`Cache TTL failed for key "${key}": ${(err as Error).message}`);
      return -2; // -2 = key does not exist (standard Redis sentinel)
    }
  }

  async reset(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.log(`Evicted ${keys.length} key(s) matching "${pattern}"`);
      }
    } catch (err) {
      this._errors++;
      this.logger.warn(`Cache RESET failed for pattern "${pattern}": ${(err as Error).message}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Health & observability
  // ---------------------------------------------------------------------------

  async ping(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  get metrics(): CacheMetrics {
    return {
      hits: this._hits,
      misses: this._misses,
      errors: this._errors,
      degraded: !this.isConnected,
    };
  }

  get isConnected(): boolean {
    return this.redis.status === 'ready';
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async onModuleDestroy(): Promise<void> {
    try {
      await this.redis.quit();
      this.logger.log('Redis client disconnected cleanly');
    } catch (err) {
      this.logger.error('Error during Redis disconnect', (err as Error).stack);
    }
  }
}
