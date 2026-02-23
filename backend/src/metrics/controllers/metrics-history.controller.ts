import { Controller, Get, Query, Param } from '@nestjs/common';
import { ElasticsearchService } from '../services/elasticsearch.service';
import { MetricsHistoryService } from '../services/metrics-history.service';

@Controller('metrics')
export class MetricsHistoryController {
  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly historyService: MetricsHistoryService,
  ) {}

  @Get('logs/search')
  async searchLogs(@Query('q') query: string, @Query('from') from = 0, @Query('size') size = 100) {
    return this.elasticsearchService.search(query, from, size);
  }

  @Get('logs/level/:level')
  async getLogsByLevel(@Param('level') level: string, @Query('from') from = 0, @Query('size') size = 100) {
    return this.elasticsearchService.getLogsByLevel(level, from, size);
  }

  @Get('history/:metricName')
  async getMetricHistory(
    @Param('metricName') metricName: string,
    @Query('hours') hours = 24,
  ) {
    return this.historyService.getAggregatedHistory(metricName, hours);
  }
}
