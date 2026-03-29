export const REDIS_CLIENT = Symbol('REDIS_CLIENT');
export const REDIS_OPTIONS = Symbol('REDIS_OPTIONS');

export interface RedisModuleOptions {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  connectTimeout?: number;
  maxRetriesPerRequest?: number;
  enableReadyCheck?: boolean;
  lazyConnect?: boolean;
}
