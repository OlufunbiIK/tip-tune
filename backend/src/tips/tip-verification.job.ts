import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job, JobHandler } from 'bullmq';
import { Tip, TipStatus } from './entities/tip.entity';
import { StellarService } from '../stellar/stellar.service';
import { UnifiedFeesService } from '../fees/unified-fees.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ModerationService } from '../moderation/moderation.service';
import { TipReconciliationService } from './tip-reconciliation.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TipVerifiedEvent } from './events/tip-verified.event';
import { NotificationType } from '../notifications/notification.entity';

export interface TipVerificationJobData {
  tipId: string;
  retryCount?: number;
  maxRetries?: number;
}

@Injectable()
export class TipVerificationJob implements JobHandler<TipVerificationJobData> {
  private readonly logger = new Logger(TipVerificationJob.name);

  constructor(
    @InjectRepository(Tip)
    private readonly tipRepository: Repository<Tip>,
    private readonly stellarService: StellarService,
    private readonly feesService: UnifiedFeesService,
    private readonly notificationsService: NotificationsService,
    private readonly moderationService: ModerationService,
    private readonly reconciliationService: TipReconciliationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async process(job: Job<TipVerificationJobData>): Promise<void> {
    const { tipId, retryCount = 0, maxRetries = 3 } = job.data;
    
    this.logger.log(`Processing tip verification for tip ${tipId}, attempt ${retryCount + 1}/${maxRetries}`);

    try {
      // Get tip with all necessary relations
      const tip = await this.tipRepository.findOne({
        where: { id: tipId },
        relations: ['sender', 'artist', 'artist.user'],
      });

      if (!tip) {
        this.logger.error(`Tip ${tipId} not found for verification`);
        return;
      }

      // Skip if already verified
      if (tip.status === TipStatus.VERIFIED) {
        this.logger.log(`Tip ${tipId} already verified, skipping`);
        return;
      }

      // Check moderation status
      const moderationResult = await this.moderationService.checkTip(tip);
      if (!moderationResult.allowed) {
        this.logger.warn(`Tip ${tipId} blocked by moderation: ${moderationResult.reason}`);
        await this.handleModerationBlock(tip, moderationResult.reason);
        return;
      }

      // Verify Stellar transaction
      const verificationResult = await this.verifyStellarTransaction(tip);
      
      if (!verificationResult.verified) {
        if (retryCount < maxRetries) {
          this.logger.warn(`Tip ${tipId} verification failed, retrying: ${verificationResult.error}`);
          await this.scheduleRetry(job, retryCount + 1);
          return;
        } else {
          this.logger.error(`Tip ${tipId} verification failed after ${maxRetries} attempts: ${verificationResult.error}`);
          await this.handleVerificationFailure(tip, verificationResult.error);
          return;
        }
      }

      // Mark tip as verified
      await this.markTipVerified(tip, verificationResult);

      // Record platform fee
      await this.feesService.recordFeeForTip(tip);

      // Send notifications
      await this.sendVerificationNotifications(tip);

      // Emit verification event
      this.eventEmitter.emit('tip.verified', new TipVerifiedEvent(tip));

      this.logger.log(`Tip ${tipId} successfully verified`);

    } catch (error) {
      this.logger.error(`Error processing tip verification for ${tipId}:`, error);
      
      if (retryCount < maxRetries) {
        await this.scheduleRetry(job, retryCount + 1);
      } else {
        await this.handleVerificationFailure({ id: tipId } as Tip, error.message);
      }
    }
  }

  private async verifyStellarTransaction(tip: Tip): Promise<{
    verified: boolean;
    error?: string;
    transactionDetails?: any;
  }> {
    try {
      if (!tip.stellarTxHash) {
        return { verified: false, error: 'No transaction hash provided' };
      }

      const transaction = await this.stellarService.getTransaction(tip.stellarTxHash);
      
      if (!transaction) {
        return { verified: false, error: 'Transaction not found on network' };
      }

      // Verify transaction details
      const isValid = await this.validateTransactionDetails(tip, transaction);
      
      if (!isValid) {
        return { verified: false, error: 'Transaction details do not match tip record' };
      }

      return { verified: true, transactionDetails: transaction };

    } catch (error) {
      return { 
        verified: false, 
        error: error instanceof Error ? error.message : 'Unknown verification error' 
      };
    }
  }

  private async validateTransactionDetails(tip: Tip, transaction: any): Promise<boolean> {
    try {
      // Check if transaction is successful
      if (transaction.successful !== true) {
        return false;
      }

      // Check if transaction involves the correct asset and amount
      const payment = transaction.operations?.find((op: any) => op.type === 'payment');
      
      if (!payment) {
        return false;
      }

      // Validate amount
      const expectedAmount = parseFloat(tip.amount.toString());
      const actualAmount = parseFloat(payment.amount);
      
      if (Math.abs(expectedAmount - actualAmount) > 0.0000001) {
        return false;
      }

      // Validate destination
      if (payment.destination !== tip.artist.walletAddress) {
        return false;
      }

      // Validate asset code
      if (tip.assetCode && payment.asset_code !== tip.assetCode) {
        return false;
      }

      return true;

    } catch (error) {
      this.logger.error('Error validating transaction details:', error);
      return false;
    }
  }

  private async markTipVerified(tip: Tip, verificationResult: any): Promise<void> {
    tip.status = TipStatus.VERIFIED;
    tip.verifiedAt = new Date();
    tip.verificationDetails = verificationResult.transactionDetails;
    
    await this.tipRepository.save(tip);
  }

  private async handleVerificationFailure(tip: Tip, error: string): Promise<void> {
    tip.status = TipStatus.FAILED;
    tip.failureReason = error;
    tip.failedAt = new Date();
    
    await this.tipRepository.save(tip);

    // Send failure notification to sender
    await this.notificationsService.createNotification({
      userId: tip.senderId,
      type: NotificationType.TIP_FAILED,
      title: 'Tip Verification Failed',
      message: `Your tip of ${tip.amount} ${tip.assetCode} could not be verified: ${error}`,
      data: {
        tipId: tip.id,
        error,
      },
    });
  }

  private async handleModerationBlock(tip: Tip, reason: string): Promise<void> {
    tip.status = TipStatus.BLOCKED;
    tip.moderationReason = reason;
    tip.moderatedAt = new Date();
    
    await this.tipRepository.save(tip);

    // Send moderation notification to sender
    await this.notificationsService.createNotification({
      userId: tip.senderId,
      type: NotificationType.TIP_BLOCKED,
      title: 'Tip Blocked',
      message: `Your tip was blocked by moderation: ${reason}`,
      data: {
        tipId: tip.id,
        reason,
      },
    });
  }

  private async sendVerificationNotifications(tip: Tip): Promise<void> {
    // Notification to artist
    await this.notificationsService.createNotification({
      userId: tip.artist.userId,
      type: NotificationType.TIP_RECEIVED,
      title: 'New Tip Received!',
      message: `You received a tip of ${tip.amount} ${tip.assetCode}!`,
      data: {
        tipId: tip.id,
        amount: tip.amount,
        assetCode: tip.assetCode,
        senderId: tip.senderId,
      },
    });

    // Confirmation to sender
    await this.notificationsService.createNotification({
      userId: tip.senderId,
      type: NotificationType.TIP_VERIFIED,
      title: 'Tip Verified',
      message: `Your tip of ${tip.amount} ${tip.assetCode} has been verified and delivered!`,
      data: {
        tipId: tip.id,
        amount: tip.amount,
        assetCode: tip.assetCode,
        artistId: tip.artistId,
      },
    });
  }

  private async scheduleRetry(job: Job<TipVerificationJobData>, retryCount: number): Promise<void> {
    const delay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Exponential backoff, max 30s
    
    await job.add('tip-verification', {
      ...job.data,
      retryCount,
    }, {
      delay,
      removeOnComplete: true,
      removeOnFail: true,
    });

    this.logger.log(`Scheduled retry for tip ${job.data.tipId} in ${delay}ms`);
  }
}
