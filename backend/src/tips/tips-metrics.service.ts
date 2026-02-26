import { Injectable } from '@nestjs/common';
import { PrometheusService } from '../metrics/services/prometheus.service';
import { LoggingService } from '../metrics/services/logging.service';

@Injectable()
export class TipsMetricsService {
  constructor(
    private readonly prometheusService: PrometheusService,
    private readonly loggingService: LoggingService,
  ) {}

  recordTipCreated(currency: string, amount: number) {
    this.prometheusService.tipsPerSecond.inc({ currency, status: 'created' });
  }

  recordTipSuccess(tipId: string, currency: string, amount: number, fromUser: string, toArtist: string) {
    this.prometheusService.tipsPerSecond.inc({ currency, status: 'success' });
    this.loggingService.logTip(tipId, amount, currency, fromUser, toArtist);
  }

  recordTipFailure(currency: string, error: string) {
    this.prometheusService.tipsPerSecond.inc({ currency, status: 'failed' });
    this.loggingService.error(`Tip failed: ${error}`, undefined, 'TipsMetricsService');
  }

  recordStellarTransaction(txHash: string, operation: string, success: boolean, error?: string) {
    if (success) {
      this.prometheusService.stellarTransactionSuccess.inc({ operation_type: operation });
    } else {
      this.prometheusService.stellarTransactionFailure.inc({
        operation_type: operation,
        error_code: error || 'unknown',
      });
    }
    this.loggingService.logStellarTransaction(txHash, operation, success, error);
  }
}
