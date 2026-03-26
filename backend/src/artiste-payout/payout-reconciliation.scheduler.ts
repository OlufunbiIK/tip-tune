import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PayoutReconciliationService } from './payout-reconciliation.service';

@Injectable()
export class PayoutReconciliationScheduler {
  private readonly logger = new Logger(PayoutReconciliationScheduler.name);

  constructor(private readonly reconciliationService: PayoutReconciliationService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async nightlyReconcile(): Promise<void> {
    this.logger.log('Running nightly payout reconciliation...');
    const results = await this.reconciliationService.reconcileAllArtists(false);
    if (results.length > 0) {
      this.logger.warn(`Payout reconciliation found ${results.length} discrepancy(ies)`);
    } else {
      this.logger.log('Payout reconciliation found no discrepancy');
    }
    this.logger.log('Nightly payout reconciliation completed.');
  }
}
