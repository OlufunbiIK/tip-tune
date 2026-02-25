import { ConfigService } from '@nestjs/config';
import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { StellarHealthIndicator } from './stellar-health.indicator';

describe('HealthController', () => {
  let controller: HealthController;
  let redis: { ping: jest.Mock };
  let configService: { get: jest.Mock };
  let dbIndicator: { pingCheck: jest.Mock };
  let stellarIndicator: { isHealthy: jest.Mock };
  let healthCheckService: { check: jest.Mock };

  beforeEach(() => {
    redis = { ping: jest.fn().mockResolvedValue('PONG') };
    configService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        if (key === 'REDIS_HOST') return 'localhost';
        if (key === 'APP_VERSION') return '1.2.3';
        return defaultValue;
      }),
    };
    dbIndicator = {
      pingCheck: jest.fn().mockResolvedValue({ database: { status: 'up' } }),
    };
    stellarIndicator = {
      isHealthy: jest.fn().mockResolvedValue({ stellar: { status: 'up' } }),
    };
    healthCheckService = {
      check: jest.fn(async (checks: Array<() => Promise<Record<string, any>>>) => {
        const info: Record<string, any> = {};
        for (const check of checks) {
          Object.assign(info, await check());
        }
        return { status: 'ok', info, error: {}, details: info };
      }),
    };

    controller = new HealthController(
      healthCheckService as unknown as HealthCheckService,
      dbIndicator as unknown as TypeOrmHealthIndicator,
      configService as unknown as ConfigService,
      stellarIndicator as unknown as StellarHealthIndicator,
      redis as any,
    );
  });

  it('returns complete health payload with critical and warning checks', async () => {
    const result = await controller.health();

    expect(result.status).toBe('ok');
    expect(result.info.database.status).toBe('up');
    expect(result.info.redis.status).toBe('up');
    expect(result.info.stellar.status).toBe('up');
    expect(result.info.memory.status).toBe('up');
    expect(result.info.disk.status).toBe('up');
    expect(result.info.app.version).toBe('1.2.3');
  });

  it('returns readiness payload with only critical checks', async () => {
    await controller.ready();

    const checks = healthCheckService.check.mock.calls[0][0];
    expect(checks).toHaveLength(3);
  });

  it('skips redis ping when redis is not configured', async () => {
    configService.get.mockImplementation((key: string, defaultValue?: string) => {
      if (key === 'APP_VERSION') return '1.2.3';
      return defaultValue;
    });

    await controller.ready();
    expect(redis.ping).not.toHaveBeenCalled();
  });

  it('live endpoint always returns up', () => {
    const result = controller.live();
    expect(result.status).toBe('ok');
    expect(result.info.app.status).toBe('up');
    expect(result.info.app.version).toBe('1.2.3');
    expect(result.info.app.uptime).toBeGreaterThanOrEqual(0);
  });
});
