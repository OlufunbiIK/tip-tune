import { Test, TestingModule } from '@nestjs/testing';
import { RedisPlatformService } from './redis-platform.service';
import { REDIS_PLATFORM_CLIENT } from './redis-platform.module';
import Redis from 'ioredis';

describe('RedisPlatformService', () => {
  let service: RedisPlatformService;
  let redis: jest.Mocked<Redis>;

  beforeEach(async () => {
    const mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      expire: jest.fn(),
      ttl: jest.fn(),
      hget: jest.fn(),
      hset: jest.fn(),
      hgetall: jest.fn(),
      hdel: jest.fn(),
      sadd: jest.fn(),
      srem: jest.fn(),
      sismember: jest.fn(),
      smembers: jest.fn(),
      lpush: jest.fn(),
      rpush: jest.fn(),
      lpop: jest.fn(),
      rpop: jest.fn(),
      llen: jest.fn(),
      ping: jest.fn(),
      info: jest.fn(),
      incr: jest.fn(),
      keys: jest.fn(),
      flushdb: jest.fn(),
      quit: jest.fn(),
      disconnect: jest.fn(),
      status: 'ready',
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisPlatformService,
        {
          provide: REDIS_PLATFORM_CLIENT,
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<RedisPlatformService>(RedisPlatformService);
    redis = mockRedis;
  });

  describe('Basic Operations', () => {
    it('should get value', async () => {
      redis.get.mockResolvedValue('test-value');
      
      const result = await service.get('test-key');
      
      expect(redis.get).toHaveBeenCalledWith('test-key');
      expect(result).toBe('test-value');
    });

    it('should set value without TTL', async () => {
      redis.set.mockResolvedValue('OK');
      
      const result = await service.set('test-key', 'test-value');
      
      expect(redis.set).toHaveBeenCalledWith('test-key', 'test-value');
      expect(result).toBe('OK');
    });

    it('should set value with TTL', async () => {
      redis.setex.mockResolvedValue('OK');
      
      const result = await service.set('test-key', 'test-value', 3600);
      
      expect(redis.setex).toHaveBeenCalledWith('test-key', 3600, 'test-value');
      expect(result).toBe('OK');
    });

    it('should delete key', async () => {
      redis.del.mockResolvedValue(1);
      
      const result = await service.del('test-key');
      
      expect(redis.del).toHaveBeenCalledWith('test-key');
      expect(result).toBe(1);
    });

    it('should check if key exists', async () => {
      redis.exists.mockResolvedValue(1);
      
      const result = await service.exists('test-key');
      
      expect(redis.exists).toHaveBeenCalledWith('test-key');
      expect(result).toBe(1);
    });
  });

  describe('Cache Abstractions', () => {
    it('should cache get with JSON parsing', async () => {
      redis.get.mockResolvedValue('{"key":"value"}');
      
      const result = await service.cacheGet<{key: string}>('test-key');
      
      expect(redis.get).toHaveBeenCalledWith('test-key');
      expect(result).toEqual({ key: 'value' });
    });

    it('should cache get with invalid JSON returns null', async () => {
      redis.get.mockResolvedValue('invalid-json');
      
      const result = await service.cacheGet('test-key');
      
      expect(result).toBeNull();
    });

    it('should cache set with JSON serialization', async () => {
      redis.setex.mockResolvedValue('OK');
      
      await service.cacheSet('test-key', { key: 'value' }, 3600);
      
      expect(redis.setex).toHaveBeenCalledWith('test-key', 3600, '{"key":"value"}');
    });

    it('should cache delete', async () => {
      redis.del.mockResolvedValue(1);
      
      await service.cacheDel('test-key');
      
      expect(redis.del).toHaveBeenCalledWith('test-key');
    });
  });

  describe('Throttler Integration', () => {
    it('should increment throttler and set expiry on first call', async () => {
      redis.incr.mockResolvedValue(1);
      redis.expire.mockResolvedValue(1);
      
      const result = await service.incrementThrottler('test-key', 60);
      
      expect(redis.incr).toHaveBeenCalledWith('test-key');
      expect(redis.expire).toHaveBeenCalledWith('test-key', 60);
      expect(result).toBe(1);
    });

    it('should increment throttler without expiry on subsequent calls', async () => {
      redis.incr.mockResolvedValue(2);
      
      const result = await service.incrementThrottler('test-key', 60);
      
      expect(redis.incr).toHaveBeenCalledWith('test-key');
      expect(redis.expire).not.toHaveBeenCalled();
      expect(result).toBe(2);
    });

    it('should reset throttler', async () => {
      redis.del.mockResolvedValue(1);
      
      await service.resetThrottler('test-key');
      
      expect(redis.del).toHaveBeenCalledWith('test-key');
    });
  });

  describe('Health Check', () => {
    it('should return healthy status on successful ping', async () => {
      redis.ping.mockResolvedValue('PONG');
      const startSpy = jest.spyOn(Date, 'now').mockReturnValue(1000);
      const endSpy = jest.spyOn(Date, 'now').mockReturnValue(1010);
      
      const result = await service.healthCheck();
      
      expect(redis.ping).toHaveBeenCalled();
      expect(result).toEqual({
        status: 'healthy',
        responseTime: 10,
      });
      
      startSpy.mockRestore();
      endSpy.mockRestore();
    });

    it('should return unhealthy status on ping failure', async () => {
      redis.ping.mockRejectedValue(new Error('Connection failed'));
      const startSpy = jest.spyOn(Date, 'now').mockReturnValue(1000);
      const endSpy = jest.spyOn(Date, 'now').mockReturnValue(1050);
      
      const result = await service.healthCheck();
      
      expect(result).toEqual({
        status: 'unhealthy',
        responseTime: 50,
        error: 'Connection failed',
      });
      
      startSpy.mockRestore();
      endSpy.mockRestore();
    });
  });

  describe('Metrics', () => {
    it('should parse Redis info and return metrics', async () => {
      const mockInfo = `
# Memory
used_memory:1048576
used_memory_human:1M
# Stats
total_commands_processed:1000
keyspace_hits:800
keyspace_misses:200
# Clients
connected_clients:5
      `;
      
      redis.info.mockResolvedValue(mockInfo);
      
      const result = await service.getMetrics();
      
      expect(result).toEqual({
        connectedClients: 5,
        usedMemory: '1M',
        totalCommandsProcessed: 1000,
        keyspaceHits: 800,
        keyspaceMisses: 200,
        hitRate: 80,
      });
    });

    it('should handle Redis info parsing errors', async () => {
      redis.info.mockRejectedValue(new Error('Info command failed'));
      
      await expect(service.getMetrics()).rejects.toThrow('Info command failed');
    });
  });

  describe('Connection Management', () => {
    it('should check if ready', () => {
      redis.status = 'ready';
      
      expect(service.isReady()).toBe(true);
      
      redis.status = 'connecting';
      
      expect(service.isReady()).toBe(false);
    });

    it('should get status', () => {
      redis.status = 'ready';
      
      expect(service.getStatus()).toBe('ready');
    });
  });
});
