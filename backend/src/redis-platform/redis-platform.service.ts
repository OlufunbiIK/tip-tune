import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_PLATFORM_CLIENT } from './redis-platform.module';

export interface RedisHealthResult {
  status: 'healthy' | 'unhealthy';
  responseTime: number;
  error?: string;
}

export interface RedisMetrics {
  connectedClients: number;
  usedMemory: string;
  totalCommandsProcessed: number;
  keyspaceHits: number;
  keyspaceMisses: number;
  hitRate: number;
}

@Injectable()
export class RedisPlatformService {
  private readonly logger = new Logger(RedisPlatformService.name);

  constructor(@Inject(REDIS_PLATFORM_CLIENT) private readonly redis: Redis) {}

  // ─── Basic Operations ─────────────────────────────────────────────────────────────

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<'OK'> {
    if (ttl) {
      return this.redis.setex(key, ttl, value);
    }
    return this.redis.set(key, value);
  }

  async del(key: string): Promise<number> {
    return this.redis.del(key);
  }

  async exists(key: string): Promise<number> {
    return this.redis.exists(key);
  }

  async expire(key: string, ttl: number): Promise<number> {
    return this.redis.expire(key, ttl);
  }

  async ttl(key: string): Promise<number> {
    return this.redis.ttl(key);
  }

  // ─── Hash Operations ─────────────────────────────────────────────────────────────

  async hget(key: string, field: string): Promise<string | null> {
    return this.redis.hget(key, field);
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    return this.redis.hset(key, field, value);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.redis.hgetall(key);
  }

  async hdel(key: string, field: string): Promise<number> {
    return this.redis.hdel(key, field);
  }

  // ─── Set Operations ─────────────────────────────────────────────────────────────

  async sadd(key: string, member: string): Promise<number> {
    return this.redis.sadd(key, member);
  }

  async srem(key: string, member: string): Promise<number> {
    return this.redis.srem(key, member);
  }

  async sismember(key: string, member: string): Promise<number> {
    return this.redis.sismember(key, member);
  }

  async smembers(key: string): Promise<string[]> {
    return this.redis.smembers(key);
  }

  // ─── List Operations ─────────────────────────────────────────────────────────────

  async lpush(key: string, value: string): Promise<number> {
    return this.redis.lpush(key, value);
  }

  async rpush(key: string, value: string): Promise<number> {
    return this.redis.rpush(key, value);
  }

  async lpop(key: string): Promise<string | null> {
    return this.redis.lpop(key);
  }

  async rpop(key: string): Promise<string | null> {
    return this.redis.rpop(key);
  }

  async llen(key: string): Promise<number> {
    return this.redis.llen(key);
  }

  // ─── Health and Metrics ─────────────────────────────────────────────────────────

  async healthCheck(): Promise<RedisHealthResult> {
    const start = Date.now();
    try {
      await this.redis.ping();
      const responseTime = Date.now() - start;
      return {
        status: 'healthy',
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - start;
      return {
        status: 'unhealthy',
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getMetrics(): Promise<RedisMetrics> {
    try {
      const info = await this.redis.info('memory,stats,clients');
      
      const parseInfo = (info: string, section: string) => {
        const lines = info.split('\r\n');
        const sectionStart = lines.findIndex(line => line.startsWith(`#${section}`));
        const sectionEnd = lines.findIndex((line, index) => 
          index > sectionStart && line.startsWith('#')
        );
        
        const sectionLines = sectionEnd > -1 
          ? lines.slice(sectionStart + 1, sectionEnd)
          : lines.slice(sectionStart + 1);
        
        const result: Record<string, string> = {};
        sectionLines.forEach(line => {
          if (line && !line.startsWith('#')) {
            const [key, value] = line.split(':');
            if (key && value) {
              result[key] = value;
            }
          }
        });
        
        return result;
      };

      const memoryInfo = parseInfo(info, 'Memory');
      const statsInfo = parseInfo(info, 'Stats');
      const clientsInfo = parseInfo(info, 'Clients');

      const keyspaceHits = parseInt(statsInfo.keyspace_hits || '0', 10);
      const keyspaceMisses = parseInt(statsInfo.keyspace_misses || '0', 10);
      const totalCommands = parseInt(statsInfo.total_commands_processed || '0', 10);
      const hitRate = keyspaceHits + keyspaceMisses > 0 
        ? (keyspaceHits / (keyspaceHits + keyspaceMisses)) * 100 
        : 0;

      return {
        connectedClients: parseInt(clientsInfo.connected_clients || '0', 10),
        usedMemory: memoryInfo.used_memory_human || '0B',
        totalCommandsProcessed: totalCommands,
        keyspaceHits,
        keyspaceMisses,
        hitRate: Math.round(hitRate * 100) / 100,
      };
    } catch (error) {
      this.logger.error('Failed to get Redis metrics:', error);
      throw error;
    }
  }

  // ─── Cache Abstractions ─────────────────────────────────────────────────────────

  async cacheGet<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) return null;
    
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async cacheSet<T>(key: string, value: T, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    await this.set(key, serialized, ttl);
  }

  async cacheDel(key: string): Promise<void> {
    await this.del(key);
  }

  // ─── Throttler Storage Integration ───────────────────────────────────────────────

  async incrementThrottler(key: string, ttl: number): Promise<number> {
    const current = await this.redis.incr(key);
    if (current === 1) {
      await this.redis.expire(key, ttl);
    }
    return current;
  }

  async resetThrottler(key: string): Promise<void> {
    await this.del(key);
  }

  // ─── Utilities ─────────────────────────────────────────────────────────────────────

  async clearPattern(pattern: string): Promise<number> {
    const keys = await this.redis.keys(pattern);
    if (keys.length === 0) return 0;
    return this.redis.del(...keys);
  }

  async getKeysByPattern(pattern: string): Promise<string[]> {
    return this.redis.keys(pattern);
  }

  async flushDb(): Promise<'OK'> {
    return this.redis.flushdb();
  }

  // ─── Connection Management ─────────────────────────────────────────────────────────

  async quit(): Promise<'OK'> {
    return this.redis.quit();
  }

  async disconnect(): Promise<void> {
    this.redis.disconnect();
  }

  isReady(): boolean {
    return this.redis.status === 'ready';
  }

  getStatus(): string {
    return this.redis.status;
  }
}
