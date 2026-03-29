import { HealthCheckService } from '@nestjs/terminus';
import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from '../cache/cache.service';
import { HealthController } from './health.controller';

const mockHealth = () => ({
  check: jest.fn(),
});

const mockCacheService = (connected: boolean, pingResult: boolean) => ({
  ping: jest.fn().mockResolvedValue(pingResult),
  metrics: { hits: 10, misses: 2, errors: 1, degraded: !connected },
  isConnected: connected,
});

describe('HealthController', () => {
  let controller: HealthController;
  let health: jest.Mocked<HealthCheckService>;

  async function buildModule(
    connected = true,
    pingResult = true,
  ): Promise<void> {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: mockHealth() },
        {
          provide: 'DiskHealthIndicator',
          useValue: { checkStorage: jest.fn() },
        },
        {
          provide: 'MemoryHealthIndicator',
          useValue: { checkHeap: jest.fn() },
        },
        {
          provide: 'HttpHealthIndicator',
          useValue: { pingCheck: jest.fn() },
        },
        { provide: CacheService, useValue: mockCacheService(connected, pingResult) },
      ],
    })
      .overrideProvider(HealthCheckService)
      .useValue(mockHealth())
      .compile();

    controller = module.get(HealthController);
    health = module.get(HealthCheckService);
  }

  describe('check() — Redis healthy', () => {
    beforeEach(async () => buildModule(true, true));

    it('calls HealthCheckService.check with an array of indicator functions', async () => {
      health.check.mockResolvedValue({ status: 'ok', info: {}, error: {}, details: {} });
      await controller.check();
      expect(health.check).toHaveBeenCalledWith(expect.arrayContaining([expect.any(Function)]));
    });
  });

  describe('Redis health indicator', () => {
    it('returns status: up when ping succeeds', async () => {
      await buildModule(true, true);
      health.check.mockImplementation(async (indicators) => {
        // Invoke the first indicator (redis)
        const result = await (indicators[0] as () => Promise<object>)();
        return result as any;
      });
      const result = await controller.check();
      expect(result).toMatchObject({ redis: { status: 'up' } });
    });

    it('returns status: down when ping fails', async () => {
      await buildModule(false, false);
      health.check.mockImplementation(async (indicators) => {
        const result = await (indicators[0] as () => Promise<object>)();
        return result as any;
      });
      const result = await controller.check();
      expect(result).toMatchObject({ redis: { status: 'down', degraded: true } });
    });
  });
});
