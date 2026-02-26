import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { MetricsModule } from './metrics.module';

describe('Metrics Integration (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [MetricsModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/metrics (GET)', () => {
    it('should return Prometheus metrics', () => {
      return request(app.getHttpServer())
        .get('/metrics')
        .expect(200)
        .expect('Content-Type', /text\/plain/)
        .then((response) => {
          expect(response.text).toContain('# HELP');
          expect(response.text).toContain('# TYPE');
        });
    });

    it('should include HTTP metrics', () => {
      return request(app.getHttpServer())
        .get('/metrics')
        .expect(200)
        .then((response) => {
          expect(response.text).toContain('http_requests_total');
          expect(response.text).toContain('http_request_duration_seconds');
        });
    });

    it('should include system metrics', () => {
      return request(app.getHttpServer())
        .get('/metrics')
        .expect(200)
        .then((response) => {
          expect(response.text).toContain('process_cpu_user_seconds_total');
          expect(response.text).toContain('nodejs_heap_size_total_bytes');
        });
    });

    it('should include custom business metrics', () => {
      return request(app.getHttpServer())
        .get('/metrics')
        .expect(200)
        .then((response) => {
          expect(response.text).toContain('active_users_total');
          expect(response.text).toContain('tips_total');
        });
    });
  });

  describe('/metrics/health (GET)', () => {
    it('should return health status', () => {
      return request(app.getHttpServer())
        .get('/metrics/health')
        .expect(200)
        .expect('Content-Type', /json/)
        .then((response) => {
          expect(response.body.status).toBe('ok');
          expect(response.body.timestamp).toBeDefined();
          expect(response.body.uptime).toBeGreaterThan(0);
          expect(response.body.memory).toBeDefined();
        });
    });

    it('should include memory metrics', () => {
      return request(app.getHttpServer())
        .get('/metrics/health')
        .expect(200)
        .then((response) => {
          const { memory } = response.body;
          expect(memory.heapUsed).toBeGreaterThan(0);
          expect(memory.heapTotal).toBeGreaterThan(0);
          expect(memory.rss).toBeGreaterThan(0);
        });
    });
  });

  describe('Metrics Collection', () => {
    it('should track HTTP requests', async () => {
      // Make a request
      await request(app.getHttpServer()).get('/metrics/health').expect(200);

      // Check if metrics were recorded
      const response = await request(app.getHttpServer()).get('/metrics').expect(200);
      
      expect(response.text).toContain('http_requests_total');
    });

    it('should track request duration', async () => {
      await request(app.getHttpServer()).get('/metrics/health').expect(200);

      const response = await request(app.getHttpServer()).get('/metrics').expect(200);
      
      expect(response.text).toContain('http_request_duration_seconds');
    });
  });

  describe('Performance', () => {
    it('should handle multiple concurrent requests', async () => {
      const requests = Array(100)
        .fill(null)
        .map(() => request(app.getHttpServer()).get('/metrics/health'));

      const responses = await Promise.all(requests);
      
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });

    it('should return metrics quickly', async () => {
      const start = Date.now();
      await request(app.getHttpServer()).get('/metrics').expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100); // Should respond in less than 100ms
    });
  });
});
