import { Inject } from '@nestjs/common';
import { CacheService } from './cache.service';
import { CACHE_TTL } from './cache.constants';

export const InjectCache = () => Inject(CacheService);

export function Cacheable(key: string | ((...args: any[]) => string), ttl = CACHE_TTL.MEDIUM) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheService: CacheService = this.cacheService;
      if (!cacheService) return originalMethod.apply(this, args);

      const cacheKey = typeof key === 'function' ? key(...args) : key;

      const cached = await cacheService.get(cacheKey);
      if (cached !== null) return cached;

      const result = await originalMethod.apply(this, args);
      await cacheService.set(cacheKey, result, ttl);
      return result;
    };

    return descriptor;
  };
}

export function CacheEvict(pattern: string | ((...args: any[]) => string)) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);

      const cacheService: CacheService = this.cacheService;
      if (cacheService) {
        const cachePattern = typeof pattern === 'function' ? pattern(...args) : pattern;
        await cacheService.invalidatePattern(cachePattern);
      }

      return result;
    };

    return descriptor;
  };
}

export function CachePut(key: string | ((...args: any[]) => string), ttl = CACHE_TTL.MEDIUM) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);

      const cacheService: CacheService = this.cacheService;
      if (cacheService) {
        const cacheKey = typeof key === 'function' ? key(...args) : key;
        await cacheService.set(cacheKey, result, ttl);
      }

      return result;
    };

    return descriptor;
  };
}