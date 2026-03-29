import { Test, TestingModule } from '@nestjs/testing';
import Redis from 'ioredis';
import { REDIS_CLIENT, RedisModuleOptions } from './redis.constants';
import { RedisModule } from './redis.module';

// ---------------------------------------------------------------------------
// We don't spin up a real Redis in unit tests — instead we verify the module
// wires the provider correctly and that the client type is correct. E2E tests
// in a CI environment with a Redis container cover actual connectivity.
// ---------------------------------------------------------------------------

describe('RedisModule.forRoot()', () => {
  const options: RedisModuleOptions = {
    host: '127.0.0.1',
    port: 6380, // non-standard port so tests fail fast instead of lingering
    connectTimeout: 100,
    maxRetriesPerRequest: 0,
    lazyConnect: true, // don't actually connect during module setup
  };

  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [RedisModule.forRoot(options)],
    }).compile();
  });

  afterAll(async () => {
    const client = module.get<Redis>(REDIS_CLIENT);
    await client.disconnect();
    await module.close();
  });

  it('registers the REDIS_CLIENT token', () => {
    const client = module.get<Redis>(REDIS_CLIENT);
    expect(client).toBeDefined();
  });

  it('injects an ioredis instance', () => {
    const client = module.get<Redis>(REDIS_CLIENT);
    // ioredis instances expose these methods
    expect(typeof client.get).toBe('function');
    expect(typeof client.set).toBe('function');
    expect(typeof client.del).toBe('function');
    expect(typeof client.quit).toBe('function');
  });
});

describe('RedisModule token availability', () => {
  it('REDIS_CLIENT is a Symbol', () => {
    expect(typeof REDIS_CLIENT).toBe('symbol');
  });
});
