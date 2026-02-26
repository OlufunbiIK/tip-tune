import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Controller, Get, Post } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from 'throttler-storage-redis';
import Redis from 'ioredis';
import * as request from 'supertest';
import { APP_GUARD } from '@nestjs/core';
import { CustomThrottlerGuard } from '../src/common/guards/throttler.guard';
import { ThrottleOverride } from '../src/common/decorators/throttle-override.decorator';

// Test controller
@Controller('test')
class TestController {
  @Get('public')
  getPublic() {
    return { message: 'public endpoint' };
  }

  @Post('auth')
  @ThrottleOverride('AUTH_ENDPOINTS')
  postAuth() {
    return { message: 'auth endpoint' };
  }

  @Post('upload')
  @ThrottleOverride('FILE_UPLOAD')
  postUpload() {
    return { message: 'upload endpoint' };
  }

  @Get('search')
  @ThrottleOverride('SEARCH')
  getSearch() {
    return { message: 'search endpoint' };
  }
}

describe('Throttler Integration Tests (e2e)', () => {
  let app: INestApplication;
  let redis: Redis;

  beforeAll(async () => {
    // Create Redis client for testing
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      db: 15, // Use separate DB for testing
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [
            {
              name: 'default',
              ttl: 60000,
              limit: 60,
            },
          ],
          storage: new ThrottlerStorageRedisService(redis),
        }),
      ],
      controllers: [TestController],
      providers: [
        {
          provide: APP_GUARD,
          useClass: CustomThrottlerGuard,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await redis.flushdb(); // Clean up test data
    await redis.quit();
    await app.close();
  });

  beforeEach(async () => {
    await redis.flushdb(); // Clean before each test
  });

  describe('Rate Limit Headers', () => {
    it('should include rate limit headers in response', async () => {
      const response = await request(app.getHttpServer())
        .get('/test/public')
        .expect(200);

      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });

    it('should decrement remaining count on each request', async () => {
      const response1 = await request(app.getHttpServer())
        .get('/test/public')
        .expect(200);

      const response2 = await request(app.getHttpServer())
        .get('/test/public')
        .expect(200);

      const remaining1 = parseInt(response1.headers['x-ratelimit-remaining']);
      const remaining2 = parseInt(response2.headers['x-ratelimit-remaining']);

      expect(remaining2).toBeLessThan(remaining1);
    });
  });

  describe('Rate Limit Enforcement', () => {
    it('should block requests after limit is exceeded', async () => {
      const limit = 5;
      
      // Make requests up to the limit
      for (let i = 0; i < limit; i++) {
        await request(app.getHttpServer())
          .post('/test/upload')
          .expect(201);
      }

      // Next request should be rate limited
      const response = await request(app.getHttpServer())
        .post('/test/upload')
        .expect(429);

      expect(response.body.message).toContain('Rate limit exceeded');
      expect(response.headers['retry-after']).toBeDefined();
    });

    it('should return 429 with Retry-After header', async () => {
      // Exhaust the limit
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/test/upload')
          .expect(201);
      }

      const response = await request(app.getHttpServer())
        .post('/test/upload')
        .expect(429);

      expect(response.headers['retry-after']).toBeDefined();
      const retryAfter = parseInt(response.headers['retry-after']);
      expect(retryAfter).toBeGreaterThan(0);
      expect(retryAfter).toBeLessThanOrEqual(60);
    });
  });

  describe('Per-Route Rate Limits', () => {
    it('should apply different limits to different endpoints', async () => {
      // Auth endpoint: 10 requests per minute
      for (let i = 0; i < 10; i++) {
        await request(app.getHttpServer())
          .post('/test/auth')
          .expect(201);
      }

      await request(app.getHttpServer())
        .post('/test/auth')
        .expect(429);

      // Search endpoint should still work (100 requests per minute)
      await request(app.getHttpServer())
        .get('/test/search')
        .expect(200);
    });

    it('should enforce strict limit on file upload endpoints', async () => {
      // File upload: 5 requests per minute
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/test/upload')
          .expect(201);
      }

      await request(app.getHttpServer())
        .post('/test/upload')
        .expect(429);
    });

    it('should allow more requests on search endpoints', async () => {
      // Search: 100 requests per minute
      for (let i = 0; i < 50; i++) {
        await request(app.getHttpServer())
          .get('/test/search')
          .expect(200);
      }

      // Should still be under the limit
      await request(app.getHttpServer())
        .get('/test/search')
        .expect(200);
    });
  });

  describe('IP-based Rate Limiting', () => {
    it('should track rate limits per IP address', async () => {
      // Make requests from first IP
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/test/upload')
          .set('X-Forwarded-For', '192.168.1.1')
          .expect(201);
      }

      // First IP should be rate limited
      await request(app.getHttpServer())
        .post('/test/upload')
        .set('X-Forwarded-For', '192.168.1.1')
        .expect(429);

      // Second IP should still work
      await request(app.getHttpServer())
        .post('/test/upload')
        .set('X-Forwarded-For', '192.168.1.2')
        .expect(201);
    });
  });

  describe('Redis Storage', () => {
    it('should store rate limit data in Redis', async () => {
      await request(app.getHttpServer())
        .get('/test/public')
        .expect(200);

      const keys = await redis.keys('*');
      expect(keys.length).toBeGreaterThan(0);
    });

    it('should expire rate limit data after TTL', async () => {
      await request(app.getHttpServer())
        .get('/test/public')
        .expect(200);

      const keys = await redis.keys('*');
      expect(keys.length).toBeGreaterThan(0);

      // Check TTL is set
      const ttl = await redis.ttl(keys[0]);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(60);
    });
  });

  describe('Whitelisted IPs', () => {
    it('should bypass rate limiting for localhost', async () => {
      // Make many requests from localhost
      for (let i = 0; i < 100; i++) {
        await request(app.getHttpServer())
          .post('/test/upload')
          .set('X-Forwarded-For', '127.0.0.1')
          .expect(201);
      }

      // Should still work
      const response = await request(app.getHttpServer())
        .post('/test/upload')
        .set('X-Forwarded-For', '127.0.0.1')
        .expect(201);

      expect(response.headers['x-ratelimit-limit']).toBe('unlimited');
    });
  });
});
