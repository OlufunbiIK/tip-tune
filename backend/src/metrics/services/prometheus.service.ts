import { Injectable } from '@nestjs/common';
import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

@Injectable()
export class PrometheusService {
  public readonly registry: Registry;
  
  // HTTP Metrics
  public readonly httpRequestDuration: Histogram;
  public readonly httpRequestTotal: Counter;
  public readonly httpRequestErrors: Counter;
  
  // Database Metrics
  public readonly dbQueryDuration: Histogram;
  public readonly dbConnectionPool: Gauge;
  
  // Business Metrics
  public readonly activeUsers: Gauge;
  public readonly tipsPerSecond: Counter;
  public readonly stellarTransactionSuccess: Counter;
  public readonly stellarTransactionFailure: Counter;
  
  // Queue Metrics
  public readonly queueLength: Gauge;
  
  // System Metrics
  public readonly memoryUsage: Gauge;
  public readonly cpuUsage: Gauge;

  constructor() {
    this.registry = new Registry();
    
    // Collect default metrics (CPU, memory, etc.)
    collectDefaultMetrics({ register: this.registry });

    // HTTP Metrics
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.httpRequestTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.httpRequestErrors = new Counter({
      name: 'http_request_errors_total',
      help: 'Total number of HTTP request errors',
      labelNames: ['method', 'route', 'error_type'],
      registers: [this.registry],
    });

    // Database Metrics
    this.dbQueryDuration = new Histogram({
      name: 'db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['query_type', 'table'],
      buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1],
      registers: [this.registry],
    });

    this.dbConnectionPool = new Gauge({
      name: 'db_connection_pool_size',
      help: 'Current database connection pool size',
      labelNames: ['state'],
      registers: [this.registry],
    });

    // Business Metrics
    this.activeUsers = new Gauge({
      name: 'active_users_total',
      help: 'Number of currently active users',
      registers: [this.registry],
    });

    this.tipsPerSecond = new Counter({
      name: 'tips_total',
      help: 'Total number of tips processed',
      labelNames: ['currency', 'status'],
      registers: [this.registry],
    });

    this.stellarTransactionSuccess = new Counter({
      name: 'stellar_transactions_success_total',
      help: 'Total number of successful Stellar transactions',
      labelNames: ['operation_type'],
      registers: [this.registry],
    });

    this.stellarTransactionFailure = new Counter({
      name: 'stellar_transactions_failure_total',
      help: 'Total number of failed Stellar transactions',
      labelNames: ['operation_type', 'error_code'],
      registers: [this.registry],
    });

    // Queue Metrics
    this.queueLength = new Gauge({
      name: 'queue_length',
      help: 'Current length of processing queues',
      labelNames: ['queue_name'],
      registers: [this.registry],
    });

    // System Metrics
    this.memoryUsage = new Gauge({
      name: 'app_memory_usage_bytes',
      help: 'Application memory usage in bytes',
      labelNames: ['type'],
      registers: [this.registry],
    });

    this.cpuUsage = new Gauge({
      name: 'app_cpu_usage_percent',
      help: 'Application CPU usage percentage',
      registers: [this.registry],
    });

    this.startSystemMetricsCollection();
  }

  private startSystemMetricsCollection() {
    setInterval(() => {
      const usage = process.memoryUsage();
      this.memoryUsage.set({ type: 'heap_used' }, usage.heapUsed);
      this.memoryUsage.set({ type: 'heap_total' }, usage.heapTotal);
      this.memoryUsage.set({ type: 'rss' }, usage.rss);
      this.memoryUsage.set({ type: 'external' }, usage.external);
    }, 5000);
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}
