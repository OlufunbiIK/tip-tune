import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Track } from '../tracks/entities/track.entity';
import { Tip, TipStatus } from './entities/tip.entity';

export interface DiscrepancyReport {
  trackId: string;
  expectedTotal: number;
  actualTotal: number;
  difference: number;
}

@Injectable()
export class TipReconciliationService {
  private readonly logger = new Logger(TipReconciliationService.name);

  constructor(
    @InjectRepository(Track)
    private readonly trackRepository: Repository<Track>,
    @InjectRepository(Tip)
    private readonly tipRepository: Repository<Tip>,
  ) {}

  /**
   * Recalculates totalTips for a single track based on VERIFIED tips.
   */
  async reconcileTrack(trackId: string): Promise<void> {
    const track = await this.trackRepository.findOne({ where: { id: trackId } });
    if (!track) return;

    // Use VERIFIED instead of 'completed' to match your TipStatus enum
    const { sum } = await this.tipRepository
      .createQueryBuilder('tip')
      .select('SUM(tip.amount)', 'sum')
      .where('tip.trackId = :trackId', { trackId })
      .andWhere('tip.status = :status', { status: TipStatus.VERIFIED })
      .getRawOne();

    const actualTotal = parseFloat(sum) || 0;
    const currentTotal = typeof track.totalTips === 'string' 
      ? parseFloat(track.totalTips) 
      : track.totalTips;

    // Allow a tiny margin for decimal precision drift between scale 2 and scale 7
    if (Math.abs(actualTotal - currentTotal) > 0.01) {
      this.logger.warn(
        `Discrepancy found on track ${trackId}: Cached ${currentTotal}, Actual ${actualTotal}. Fixing...`,
      );
      track.totalTips = actualTotal;
    }

    track.lastRecalculatedAt = new Date();
    await this.trackRepository.save(track);
  }

  /**
   * Nightly Cron Job: Runs every day at midnight.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async reconcileAllTracks(): Promise<void> {
    this.logger.log('Starting nightly tip reconciliation cron job...');
    const tracks = await this.trackRepository.find({ select: ['id'] });
    
    for (const track of tracks) {
      await this.reconcileTrack(track.id);
    }
    this.logger.log('Nightly tip reconciliation completed.');
  }

  /**
   * Finds tracks where the cached total doesn't match the sum of verified tips.
   */
  async findDiscrepancies(): Promise<DiscrepancyReport[]> {
    const discrepancies: DiscrepancyReport[] = [];
    const tracks = await this.trackRepository.find({ select: ['id', 'totalTips'] });

    for (const track of tracks) {
      const { sum } = await this.tipRepository
        .createQueryBuilder('tip')
        .select('SUM(tip.amount)', 'sum')
        .where('tip.trackId = :trackId', { trackId: track.id })
        .andWhere('tip.status = :status', { status: TipStatus.VERIFIED })
        .getRawOne();

      const actualTotal = parseFloat(sum) || 0;
      const currentTotal = typeof track.totalTips === 'string' 
        ? parseFloat(track.totalTips) 
        : track.totalTips;

      if (Math.abs(actualTotal - currentTotal) > 0.01) {
        discrepancies.push({
          trackId: track.id,
          expectedTotal: actualTotal,
          actualTotal: currentTotal,
          difference: Math.abs(actualTotal - currentTotal),
        });
      }
    }
    return discrepancies;
  }
}