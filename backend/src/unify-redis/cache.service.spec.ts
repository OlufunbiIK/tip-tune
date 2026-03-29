import { Test, TestingModule } from '@nestjs/testing';
import { REDIS_CLIENT } from '../redis/redis.constants';
import { CacheService } from './cache.service';

// ---------------------------------------------------------------------------
// Shared mock factory — rebuilt fresh for each test suite section so state
// does not leak between specs.
// ---------------------------------------------------------------------------

const mockRedis = () => ({
  status: 'ready' as string,
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  ttl: jest.fn(),
  keys: jest.fn(),
  ping: jest.fn(),
  quit: jest.fn(),
});

type MockRedis = ReturnType<typeof mockRedis>;

async function createService(redis: MockRedis): Promise<CacheService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      CacheService,
      { provide: REDIS_CLIENT, useValue: redis },
    ],
  }).compile();

  return module.get(CacheService);
}

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

describe('CacheService.get()', () => {
  let redis: MockRedis;
  let service: CacheService;

  beforeEach(async () => {
    redis = mockRedis();
    service = await createService(redis);
  });

  it('returns null and increments misses when key not found', async () => {
    redis.get.mockResolvedValue(null);
    const result = await service.get('missing-key');
    expect(result).toBeNull();
    expect(service.metrics.misses).toBe(1);
    expect(service.metrics.hits).toBe(0);
  });

  it('deserializes JSON and increments hits on cache hit', async () => {
    const payload = { score: 42, userId: 'abc' };
    redis.get.mockResolvedValue(JSON.stringify(payload));
    const result = await service.get<typeof payload>('some-key');
    expect(result).toEqual(payload);
    expect(service.metrics.hits).toBe(1);
  });

  it('returns null and increments errors when Redis throws', async () => {
    redis.get.mockRejectedValue(new Error('ECONNREFUSED'));
    const result = await service.get('broken-key');
    expect(result).toBeNull();
    expect(service.metrics.errors).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// SET
// ---------------------------------------------------------------------------

describe('CacheService.set()', () => {
  let redis: MockRedis;
  let service: CacheService;

  beforeEach(async () => {
    redis = mockRedis();
    service = await createService(redis);
  });

  it('calls redis.set without EX when no TTL is given', async () => {
    redis.set.mockResolvedValue('OK');
    const ok = await service.set('key', { foo: 'bar' });
    expect(ok).toBe(true);
    expect(redis.set).toHaveBeenCalledWith('key', JSON.stringify({ foo: 'bar' }));
  });

  it('calls redis.set with EX when TTL is specified', async () => {
    redis.set.mockResolvedValue('OK');
    const ok = await service.set('key', 'hello', { ttl: 120 });
    expect(ok).toBe(true);
    expect(redis.set).toHaveBeenCalledWith('key', '"hello"', 'EX', 120);
  });

  it('returns false and increments errors when Redis throws', async () => {
    redis.set.mockRejectedValue(new Error('OOM'));
    const ok = await service.set('key', 'value');
    expect(ok).toBe(false);
    expect(service.metrics.errors).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// DEL
// ---------------------------------------------------------------------------

describe('CacheService.del()', () => {
  let redis: MockRedis;
  let service: CacheService;

  beforeEach(async () => {
    redis = mockRedis();
    service = await createService(redis);
  });

  it('returns the number of deleted keys on success', async () => {
    redis.del.mockResolvedValue(2);
    const count = await service.del('k1', 'k2');
    expect(count).toBe(2);
    expect(redis.del).toHaveBeenCalledWith('k1', 'k2');
  });

  it('returns 0 and increments errors when Redis throws', async () => {
    redis.del.mockRejectedValue(new Error('READONLY'));
    const count = await service.del('k1');
    expect(count).toBe(0);
    expect(service.metrics.errors).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// EXISTS
// ---------------------------------------------------------------------------

describe('CacheService.exists()', () => {
  let redis: MockRedis;
  let service: CacheService;

  beforeEach(async () => {
    redis = mockRedis();
    service = await createService(redis);
  });

  it('returns true when key exists', async () => {
    redis.exists.mockResolvedValue(1);
    expect(await service.exists('key')).toBe(true);
  });

  it('returns false when key does not exist', async () => {
    redis.exists.mockResolvedValue(0);
    expect(await service.exists('key')).toBe(false);
  });

  it('returns false on Redis error', async () => {
    redis.exists.mockRejectedValue(new Error('timeout'));
    expect(await service.exists('key')).toBe(false);
    expect(service.metrics.errors).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// TTL
// ---------------------------------------------------------------------------

describe('CacheService.ttl()', () => {
  let redis: MockRedis;
  let service: CacheService;

  beforeEach(async () => {
    redis = mockRedis();
    service = await createService(redis);
  });

  it('returns the remaining TTL in seconds', async () => {
    redis.ttl.mockResolvedValue(300);
    expect(await service.ttl('key')).toBe(300);
  });

  it('returns -2 on Redis error (key-does-not-exist sentinel)', async () => {
    redis.ttl.mockRejectedValue(new Error('timeout'));
    expect(await service.ttl('key')).toBe(-2);
    expect(service.metrics.errors).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// RESET (pattern eviction)
// ---------------------------------------------------------------------------

describe('CacheService.reset()', () => {
  let redis: MockRedis;
  let service: CacheService;

  beforeEach(async () => {
    redis = mockRedis();
    service = await createService(redis);
  });

  it('deletes all keys matching a glob pattern', async () => {
    redis.keys.mockResolvedValue(['prefix:1', 'prefix:2']);
    redis.del.mockResolvedValue(2);
    await service.reset('prefix:*');
    expect(redis.del).toHaveBeenCalledWith('prefix:1', 'prefix:2');
  });

  it('does not call del when no keys match', async () => {
    redis.keys.mockResolvedValue([]);
    await service.reset('empty:*');
    expect(redis.del).not.toHaveBeenCalled();
  });

  it('increments errors on Redis failure', async () => {
    redis.keys.mockRejectedValue(new Error('timeout'));
    await service.reset('any:*');
    expect(service.metrics.errors).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// PING & Health
// ---------------------------------------------------------------------------

describe('CacheService.ping()', () => {
  let redis: MockRedis;
  let service: CacheService;

  beforeEach(async () => {
    redis = mockRedis();
    service = await createService(redis);
  });

  it('returns true when Redis responds PONG', async () => {
    redis.ping.mockResolvedValue('PONG');
    expect(await service.ping()).toBe(true);
  });

  it('returns false when Redis is unreachable', async () => {
    redis.ping.mockRejectedValue(new Error('ECONNREFUSED'));
    expect(await service.ping()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Metrics accumulation
// ---------------------------------------------------------------------------

describe('CacheService metrics', () => {
  it('correctly accumulates hits, misses and errors across operations', async () => {
    const redis = mockRedis();
    const service = await createService(redis);

    redis.get.mockResolvedValueOnce('"a"');           // hit
    redis.get.mockResolvedValueOnce(null);            // miss
    redis.get.mockRejectedValueOnce(new Error('x')); // error

    await service.get('k1');
    await service.get('k2');
    await service.get('k3');

    expect(service.metrics).toEqual({
      hits: 1,
      misses: 1,
      errors: 1,
      degraded: false, // status is 'ready' in mock
    });
  });

  it('reports degraded=true when redis.status is not "ready"', async () => {
    const redis = mockRedis();
    redis.status = 'reconnecting';
    const service = await createService(redis);
    expect(service.metrics.degraded).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

describe('CacheService.onModuleDestroy()', () => {
  it('calls redis.quit on module teardown', async () => {
    const redis = mockRedis();
    redis.quit.mockResolvedValue('OK');
    const service = await createService(redis);
    await service.onModuleDestroy();
    expect(redis.quit).toHaveBeenCalledTimes(1);
  });
});
