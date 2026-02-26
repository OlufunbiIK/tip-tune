import { Module, Global } from '@nestjs/common';
import { RateLimitMetricsService } from './services/rate-limit-metrics.service';
import { RateLimitMetricsController } from './controllers/rate-limit-metrics.controller';

@Global()
@Module({
  providers: [RateLimitMetricsService],
  controllers: [RateLimitMetricsController],
  exports: [RateLimitMetricsService],
})
export class CommonModule {}
