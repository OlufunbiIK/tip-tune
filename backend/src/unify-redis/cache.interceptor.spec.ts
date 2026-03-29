import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { CacheInterceptor, CACHE_TTL_METADATA } from './cache.interceptor';
import { CacheService } from './cache.service';

// ---------------------------------------------------------------------------
// Helper factories
// ---------------------------------------------------------------------------

function makeContext(method = 'GET', path = '/leaderboard', query = {}): ExecutionContext {
  const mockRequest = { method, path, query };
  const mockResponse = { setHeader: jest.fn() };
  const mockHandler = {};

  return {
    switchToHttp: () => ({
      getRequest: () => mockRequest,
      getResponse: () => mockResponse,
    }),
    getHandler: () => mockHandler,
  } as unknown as ExecutionContext;
}

function makeHandler(returnValue: unknown): jest.Mock {
  return jest.fn().mockReturnValue(of(returnValue));
}

const mockCacheService = (): jest.Mocked<CacheService> =>
  ({
    get: jest.fn(),
    set: jest.fn(),
    ping: jest.fn(),
    metrics: { hits: 0, misses: 0, errors: 0, degraded: false },
    isConnected: true,
  } as unknown as jest.Mocked<CacheService>);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CacheInterceptor', () => {
  let interceptor: CacheInterceptor;
  let cache: jest.Mocked<CacheService>;
  let reflector: Reflector;

  beforeEach(async () => {
    cache = mockCacheService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheInterceptor,
        { provide: CacheService, useValue: cache },
        Reflector,
      ],
    }).compile();

    interceptor = module.get(CacheInterceptor);
    reflector = module.get(Reflector);
  });

  describe('non-GET requests', () => {
    it('passes through POST requests without touching the cache', async () => {
      const ctx = makeContext('POST', '/leaderboard');
      const next = { handle: makeHandler({ ok: true }) };

      const result$ = await interceptor.intercept(ctx, next);
      const emission = await new Promise((res) => result$.subscribe(res));

      expect(emission).toEqual({ ok: true });
      expect(cache.get).not.toHaveBeenCalled();
      expect(cache.set).not.toHaveBeenCalled();
    });

    it('passes through DELETE requests without touching the cache', async () => {
      const ctx = makeContext('DELETE', '/cache/key');
      const next = { handle: makeHandler(null) };

      const result$ = await interceptor.intercept(ctx, next);
      await new Promise((res) => result$.subscribe(res));

      expect(cache.get).not.toHaveBeenCalled();
    });
  });

  describe('GET without @CacheResponse decorator', () => {
    it('passes through without caching when no TTL metadata is present', async () => {
      jest.spyOn(reflector, 'get').mockReturnValue(undefined);
      const ctx = makeContext('GET', '/leaderboard');
      const next = { handle: makeHandler({ data: [] }) };

      const result$ = await interceptor.intercept(ctx, next);
      const emission = await new Promise((res) => result$.subscribe(res));

      expect(emission).toEqual({ data: [] });
      expect(cache.get).not.toHaveBeenCalled();
    });
  });

  describe('cache MISS — route decorated with @CacheResponse', () => {
    beforeEach(() => {
      jest.spyOn(reflector, 'get').mockImplementation((metadataKey) => {
        if (metadataKey === CACHE_TTL_METADATA) return 60;
        return undefined; // no custom key
      });
    });

    it('calls the handler, stores the result, and sets X-Cache: MISS', async () => {
      cache.get.mockResolvedValue(null);
      cache.set.mockResolvedValue(true);

      const ctx = makeContext('GET', '/leaderboard');
      const response = ctx.switchToHttp().getResponse() as { setHeader: jest.Mock };
      const next = { handle: makeHandler({ scores: [1, 2, 3] }) };

      const result$ = await interceptor.intercept(ctx, next);
      await new Promise<void>((res) => result$.subscribe({ complete: res }));

      expect(cache.get).toHaveBeenCalledWith('http:/leaderboard');
      expect(cache.set).toHaveBeenCalledWith(
        'http:/leaderboard',
        { scores: [1, 2, 3] },
        { ttl: 60 },
      );
      expect(response.setHeader).toHaveBeenCalledWith('X-Cache', 'MISS');
    });
  });

  describe('cache HIT', () => {
    beforeEach(() => {
      jest.spyOn(reflector, 'get').mockImplementation((metadataKey) => {
        if (metadataKey === CACHE_TTL_METADATA) return 60;
        return undefined;
      });
    });

    it('returns cached value and sets X-Cache: HIT without calling handler', async () => {
      const cached = { scores: [99, 88] };
      cache.get.mockResolvedValue(cached);

      const ctx = makeContext('GET', '/leaderboard');
      const response = ctx.switchToHttp().getResponse() as { setHeader: jest.Mock };
      const next = { handle: makeHandler({ scores: [] }) }; // should not be called

      const result$ = await interceptor.intercept(ctx, next);
      const emission = await new Promise((res) => result$.subscribe(res));

      expect(emission).toEqual(cached);
      expect(next.handle).not.toHaveBeenCalled();
      expect(response.setHeader).toHaveBeenCalledWith('X-Cache', 'HIT');
    });
  });

  describe('Redis degradation', () => {
    beforeEach(() => {
      jest.spyOn(reflector, 'get').mockImplementation((metadataKey) => {
        if (metadataKey === CACHE_TTL_METADATA) return 60;
        return undefined;
      });
    });

    it('falls through to the handler when cache.get throws', async () => {
      cache.get.mockRejectedValue(new Error('ECONNREFUSED'));
      const ctx = makeContext('GET', '/leaderboard');
      const next = { handle: makeHandler({ live: true }) };

      const result$ = await interceptor.intercept(ctx, next);
      const emission = await new Promise((res) => result$.subscribe(res));

      expect(emission).toEqual({ live: true });
    });
  });

  describe('cache key construction', () => {
    beforeEach(() => {
      jest.spyOn(reflector, 'get').mockImplementation((metadataKey) => {
        if (metadataKey === CACHE_TTL_METADATA) return 30;
        return undefined;
      });
    });

    it('incorporates query-string parameters into the cache key', async () => {
      cache.get.mockResolvedValue(null);
      cache.set.mockResolvedValue(true);

      const ctx = makeContext('GET', '/scores', { page: '2', limit: '20' });
      const next = { handle: makeHandler([]) };

      await interceptor.intercept(ctx, next);

      const calledKey: string = (cache.get as jest.Mock).mock.calls[0][0];
      expect(calledKey).toContain('/scores');
      expect(calledKey).toContain('page=2');
      expect(calledKey).toContain('limit=20');
    });
  });
});
