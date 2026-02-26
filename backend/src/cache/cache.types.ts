export interface CacheOptions {
  ttl?: number;
  key?: string;
  namespace?: string;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
  memoryUsage: number;
  keyCount: number;
}

export interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  expiresAt: number;
  hits: number;
}

export interface WarmupConfig {
  key: string;
  loader: () => Promise<any>;
  ttl: number;
}

export enum CacheLayer {
  MEMORY = 'memory',
  REDIS = 'redis',
  BOTH = 'both',
}