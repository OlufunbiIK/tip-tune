import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrometheusService } from './services/prometheus.service';
import { LoggingService } from './services/logging.service';
import { AlertingService } from './services/alerting.service';
import { ElasticsearchService } from './services/elasticsearch.service';
import { PagerDutyService } from './services/pagerduty.service';
import { MetricsHistoryService } from './services/metrics-history.service';
import { MetricsInterceptor } from './interceptors/metrics.interceptor';
import { MetricsController } from './controllers/metrics.controller';
import { MetricsHistoryController } from './controllers/metrics-history.controller';
import { MetricsGateway } from './gateways/metrics.gateway';
import { MetricHistory } from './entities/metric-history.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([MetricHistory])],
  providers: [
    PrometheusService,
    LoggingService,
    AlertingService,
    ElasticsearchService,
    PagerDutyService,
    MetricsHistoryService,
    MetricsGateway,
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
  controllers: [MetricsController, MetricsHistoryController],
  exports: [PrometheusService, LoggingService, AlertingService, ElasticsearchService, PagerDutyService],
})
export class MetricsModule {}
