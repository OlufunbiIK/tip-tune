import { Test, TestingModule } from '@nestjs/testing';
import { MetricsController } from './metrics.controller';
import { PrometheusService } from '../services/prometheus.service';

describe('MetricsController', () => {
  let controller: MetricsController;
  let prometheusService: PrometheusService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [PrometheusService],
    }).compile();

    controller = module.get<MetricsController>(MetricsController);
    prometheusService = module.get<PrometheusService>(PrometheusService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMetrics', () => {
    it('should return metrics in Prometheus format', async () => {
      const metrics = await controller.getMetrics();
      expect(metrics).toBeDefined();
      expect(typeof metrics).toBe('string');
      expect(metrics.length).toBeGreaterThan(0);
    });

    it('should include HTTP metrics', async () => {
      prometheusService.httpRequestTotal.inc({ method: 'GET', route: '/test', status_code: '200' });
      const metrics = await controller.getMetrics();
      expect(metrics).toContain('http_requests_total');
    });
  });

  describe('healthCheck', () => {
    it('should return health status', () => {
      const health = controller.healthCheck();
      expect(health).toBeDefined();
      expect(health.status).toBe('ok');
      expect(health.timestamp).toBeDefined();
      expect(health.uptime).toBeGreaterThan(0);
      expect(health.memory).toBeDefined();
    });

    it('should include memory information', () => {
      const health = controller.healthCheck();
      expect(health.memory.heapUsed).toBeDefined();
      expect(health.memory.heapTotal).toBeDefined();
      expect(health.memory.rss).toBeDefined();
    });
  });
});
