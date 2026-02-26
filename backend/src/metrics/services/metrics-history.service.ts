import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { MetricHistory } from '../entities/metric-history.entity';
import { PrometheusService } from './prometheus.service';

@Injectable()
export class MetricsHistoryService {
  constructor(
    @InjectRepository(MetricHistory)
    private readonly metricsRepo: Repository<MetricHistory>,
    private readonly prometheusService: PrometheusService,
  ) {
    this.startHistoricalCollection();
  }

  private startHistoricalCollection() {
    setInterval(async () => {
      await this.collectAndStore();
    }, 60000); // Store every minute
  }

  private async collectAndStore() {
    try {
      const metrics = [
        { name: 'active_users', value: await this.getGaugeValue(this.prometheusService.activeUsers) },
        { name: 'memory_heap_used', value: process.memoryUsage().heapUsed },
        { name: 'memory_heap_total', value: process.memoryUsage().heapTotal },
        { name: 'uptime', value: process.uptime() },
      ];

      for (const metric of metrics) {
        await this.metricsRepo.save({
          metricName: metric.name,
          value: metric.value,
          labels: {},
        });
      }
    } catch (error) {
      // Silently fail if table doesn't exist yet
    }
  }

  private async getGaugeValue(gauge: any): Promise<number> {
    try {
      const metric = await gauge.get();
      return metric.values[0]?.value || 0;
    } catch {
      return 0;
    }
  }

  async getHistory(metricName: string, startTime: Date, endTime: Date) {
    return this.metricsRepo.find({
      where: {
        metricName,
        timestamp: Between(startTime, endTime),
      },
      order: { timestamp: 'ASC' },
    });
  }

  async getAggregatedHistory(metricName: string, hours: number) {
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.metricsRepo
      .createQueryBuilder('m')
      .select('DATE_TRUNC(\'minute\', m.timestamp)', 'time')
      .addSelect('AVG(m.value)', 'avg')
      .addSelect('MAX(m.value)', 'max')
      .addSelect('MIN(m.value)', 'min')
      .where('m.metricName = :name', { name: metricName })
      .andWhere('m.timestamp >= :start', { start: startTime })
      .groupBy('time')
      .orderBy('time', 'ASC')
      .getRawMany();
  }
}
