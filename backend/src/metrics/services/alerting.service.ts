import { Injectable } from '@nestjs/common';
import { PrometheusService } from '../services/prometheus.service';
import { LoggingService } from '../services/logging.service';

export interface AlertRule {
  name: string;
  condition: () => Promise<boolean>;
  severity: 'critical' | 'warning' | 'info';
  message: string;
}

@Injectable()
export class AlertingService {
  private alerts: AlertRule[] = [];
  private alertHistory: Map<string, Date> = new Map();
  private readonly cooldownPeriod = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly prometheusService: PrometheusService,
    private readonly loggingService: LoggingService,
  ) {
    this.initializeAlerts();
    this.startAlertMonitoring();
  }

  private initializeAlerts() {
    // High error rate alert
    this.alerts.push({
      name: 'high_error_rate',
      condition: async () => {
        const errorMetric = await this.prometheusService.httpRequestErrors;
        // Check if error rate is above threshold (simplified)
        return false; // Implement actual logic
      },
      severity: 'critical',
      message: 'High error rate detected in HTTP requests',
    });

    // Database connection pool exhaustion
    this.alerts.push({
      name: 'db_pool_exhaustion',
      condition: async () => {
        // Check database connection pool metrics
        return false; // Implement actual logic
      },
      severity: 'critical',
      message: 'Database connection pool near exhaustion',
    });

    // High memory usage
    this.alerts.push({
      name: 'high_memory_usage',
      condition: async () => {
        const usage = process.memoryUsage();
        const heapUsedPercent = (usage.heapUsed / usage.heapTotal) * 100;
        return heapUsedPercent > 90;
      },
      severity: 'warning',
      message: 'High memory usage detected (>90%)',
    });

    // Stellar transaction failure rate
    this.alerts.push({
      name: 'stellar_failure_rate',
      condition: async () => {
        // Check Stellar transaction failure rate
        return false; // Implement actual logic
      },
      severity: 'critical',
      message: 'High Stellar transaction failure rate',
    });
  }

  private startAlertMonitoring() {
    setInterval(async () => {
      for (const alert of this.alerts) {
        try {
          const shouldAlert = await alert.condition();
          if (shouldAlert && this.shouldSendAlert(alert.name)) {
            this.sendAlert(alert);
          }
        } catch (error) {
          this.loggingService.error(
            `Error checking alert ${alert.name}: ${error.message}`,
            error.stack,
            'AlertingService',
          );
        }
      }
    }, 30000); // Check every 30 seconds
  }

  private shouldSendAlert(alertName: string): boolean {
    const lastAlert = this.alertHistory.get(alertName);
    if (!lastAlert) return true;
    return Date.now() - lastAlert.getTime() > this.cooldownPeriod;
  }

  private async sendAlert(alert: AlertRule) {
    this.alertHistory.set(alert.name, new Date());
    
    this.loggingService.error(
      `ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`,
      undefined,
      'AlertingService',
    );

    // Send to PagerDuty if critical
    if (alert.severity === 'critical') {
      const pagerDuty = new (await import('./pagerduty.service')).PagerDutyService();
      await pagerDuty.sendAlert(alert.message, alert.severity, { alertName: alert.name });
    }
  }

  addCustomAlert(alert: AlertRule) {
    this.alerts.push(alert);
  }
}
