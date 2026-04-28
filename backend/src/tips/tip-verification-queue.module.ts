import { Module } from '@nestjs/common';
import { BullMQModule } from '@nestjs/bullmq';
import { TipVerificationJob } from './tip-verification.job';
import { TipsModule } from './tips.module';
import { UnifiedFeesModule } from '../fees/unified-fees.module';
import { StellarModule } from '../stellar/stellar.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ModerationModule } from '../moderation/moderation.module';

@Module({
  imports: [
    BullMQModule.registerQueue({
      name: 'tip-verification',
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }),
    TipsModule,
    UnifiedFeesModule,
    StellarModule,
    NotificationsModule,
    ModerationModule,
  ],
  providers: [TipVerificationJob],
  exports: [TipVerificationJob],
})
export class TipVerificationQueueModule {}
