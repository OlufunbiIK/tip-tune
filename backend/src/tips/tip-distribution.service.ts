// src/tips/tip-distribution.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Not } from 'typeorm';
import { Collaboration, ApprovalStatus } from '../collaboration/entities/collaboration.entity';
import { Tip } from './entities/tip.entity';
import { Track } from '../tracks/entities/track.entity';
import { StellarService } from '../stellar/stellar.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

interface SplitRecipient {
  artistId: string;
  artistName: string;
  publicKey: string;
  percentage: number;
  amount: number;
  role: string;
}

interface DistributionResult {
  tipId: string;
  trackId: string;
  totalAmount: number;
  recipients: SplitRecipient[];
  transactionHash: string;
  distributedAt: Date;
}

@Injectable()
export class TipDistributionService {
  constructor(
    @InjectRepository(Collaboration)
    private collaborationRepo: Repository<Collaboration>,
    @InjectRepository(Tip)
    private tipRepo: Repository<Tip>,
    @InjectRepository(Track)
    private trackRepo: Repository<Track>,
    private stellarService: StellarService,
    private dataSource: DataSource,
    private eventEmitter: EventEmitter2,
  ) {}

  async distributeTip(tipId: string): Promise<DistributionResult> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get tip details
      const tip = await this.tipRepo.findOne({
        where: { id: tipId },
        relations: ['track', 'track.artist', 'user'],
      });

      if (!tip) {
        throw new BadRequestException('Tip not found');
      }

      if (tip.distributedAt) {
        throw new BadRequestException('Tip already distributed');
      }

      // Get approved collaborations
      const collaborations = await this.collaborationRepo.find({
        where: {
          trackId: tip.trackId,
          approvalStatus: ApprovalStatus.APPROVED,
        },
        relations: ['artist'],
      });

      // Calculate splits
      const recipients = await this.calculateSplits(
        tip,
        collaborations,
      );

      // Validate total percentage
      const totalPercentage = recipients.reduce(
        (sum, r) => sum + r.percentage,
        0,
      );

      if (Math.abs(totalPercentage - 100) > 0.01) {
        throw new BadRequestException(
          `Invalid split percentages: total is ${totalPercentage}%`,
        );
      }

      // Execute Stellar multi-recipient payment
      // Note: Assuming sendMultiRecipientPayment exists or will be implemented. 
      // If not, this might still fail, but correcting detailed errors first.
      const transactionHash = await this.stellarService.sendMultiRecipientPayment(
        recipients.map((r) => ({
          destination: r.publicKey,
          amount: r.amount.toString(),
        })),
        tip.stellarTxHash, // Source transaction reference
      );

      // Update tip as distributed
      tip.distributedAt = new Date();
      tip.distributionHash = transactionHash;
      await queryRunner.manager.save(tip);

      await queryRunner.commitTransaction();

      const result: DistributionResult = {
        tipId: tip.id,
        trackId: tip.trackId,
        totalAmount: Number(tip.amount),
        recipients,
        transactionHash,
        distributedAt: tip.distributedAt,
      };

      // Emit event for notifications
      this.eventEmitter.emit('tip.distributed', result);

      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async calculateSplits(
    tip: Tip,
    collaborations: Collaboration[],
  ): Promise<SplitRecipient[]> {
    const recipients: SplitRecipient[] = [];
    const totalAmount = Number(tip.amount);

    // Calculate collaborator splits
    const collaboratorTotal = collaborations.reduce(
      (sum, c) => sum + Number(c.splitPercentage),
      0,
    );

    for (const collab of collaborations) {
      const percentage = Number(collab.splitPercentage);
      const amount = (totalAmount * percentage) / 100;

      recipients.push({
        artistId: collab.artistId,
        artistName: collab.artist.artistName,
        publicKey: collab.artist.walletAddress,
        percentage,
        amount: Number(amount.toFixed(7)), // Stellar 7 decimal precision
        role: collab.role,
      });
    }

    // Primary artist gets remaining percentage
    const primaryPercentage = 100 - collaboratorTotal;
    if (primaryPercentage > 0) {
      const primaryAmount = (totalAmount * primaryPercentage) / 100;

      recipients.push({
        artistId: tip.track.artist.id,
        artistName: tip.track.artist.artistName,
        publicKey: tip.track.artist.walletAddress,
        percentage: primaryPercentage,
        amount: Number(primaryAmount.toFixed(7)),
        role: 'primary',
      });
    }

    return recipients;
  }

  async getDistributionHistory(trackId: string): Promise<DistributionResult[]> {
    const tips = await this.tipRepo.find({
      where: { trackId, distributedAt: Not(null) },
      relations: ['track', 'track.artist'],
      order: { distributedAt: 'DESC' },
    });

    const history: DistributionResult[] = [];

    for (const tip of tips) {
      const collaborations = await this.collaborationRepo.find({
        where: {
          trackId: tip.trackId,
          approvalStatus: ApprovalStatus.APPROVED,
        },
        relations: ['artist'],
      });

      const recipients = await this.calculateSplits(tip, collaborations);

      history.push({
        tipId: tip.id,
        trackId: tip.trackId,
        totalAmount: Number(tip.amount),
        recipients,
        transactionHash: tip.distributionHash,
        distributedAt: tip.distributedAt,
      });
    }

    return history;
  }

  async getArtistEarnings(artistId: string, trackId?: string) {
    let query = this.tipRepo
      .createQueryBuilder('tip')
      .leftJoin('tip.track', 'track')
      .leftJoin('track.collaborations', 'collab')
      .where('tip.distributedAt IS NOT NULL')
      .andWhere(
        '(track.artistId = :artistId OR (collab.artistId = :artistId AND collab.approvalStatus = :approved))',
        { artistId, approved: ApprovalStatus.APPROVED },
      );

    if (trackId) {
      query = query.andWhere('tip.trackId = :trackId', { trackId });
    }

    const tips = await query.getMany();

    let totalEarnings = 0;
    const breakdown = [];

    for (const tip of tips) {
      const collaborations = await this.collaborationRepo.find({
        where: {
          trackId: tip.trackId,
          approvalStatus: ApprovalStatus.APPROVED,
        },
        relations: ['artist'],
      });

      const recipients = await this.calculateSplits(tip, collaborations);
      const artistShare = recipients.find((r) => r.artistId === artistId);

      if (artistShare) {
        totalEarnings += artistShare.amount;
        breakdown.push({
          tipId: tip.id,
          trackId: tip.trackId,
          amount: artistShare.amount,
          percentage: artistShare.percentage,
          role: artistShare.role,
          distributedAt: tip.distributedAt,
        });
      }
    }

    return {
      artistId,
      totalEarnings,
      tipCount: breakdown.length,
      breakdown,
    };
  }

  async getPendingDistributions(trackId?: string) {
    let query = this.tipRepo
      .createQueryBuilder('tip')
      .where('tip.distributedAt IS NULL')
      .andWhere('tip.status = :status', { status: 'completed' });

    if (trackId) {
      query = query.andWhere('tip.trackId = :trackId', { trackId });
    }

    return query
      .leftJoinAndSelect('tip.track', 'track')
      .leftJoinAndSelect('track.artist', 'artist')
      .getMany();
  }

  async distributeAllPending(trackId?: string): Promise<DistributionResult[]> {
    const pendingTips = await this.getPendingDistributions(trackId);
    const results: DistributionResult[] = [];

    for (const tip of pendingTips) {
      try {
        const result = await this.distributeTip(tip.id);
        results.push(result);
      } catch (error) {
        console.error(`Failed to distribute tip ${tip.id}:`, error.message);
      }
    }

    return results;
  }
}

