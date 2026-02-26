import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { PlatformFee, FeeCollectionStatus } from './entities/platform-fee.entity';
import { FeeConfiguration } from './entities/fee-configuration.entity';
import { Tip } from '../tips/entities/tip.entity';
import { Artist } from '../artists/entities/artist.entity';
import { User } from '../users/entities/user.entity';
import { FeeCalculatorService } from './fee-calculator.service';
import { StellarService } from '../stellar/stellar.service';

@Injectable()
export class FeesService {
  constructor(
    @InjectRepository(PlatformFee)
    private readonly platformFeeRepository: Repository<PlatformFee>,
    @InjectRepository(FeeConfiguration)
    private readonly feeConfigRepository: Repository<FeeConfiguration>,
    @InjectRepository(Artist)
    private readonly artistRepository: Repository<Artist>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly feeCalculator: FeeCalculatorService,
    private readonly stellarService: StellarService,
  ) {}

  async getActiveConfiguration(now: Date = new Date()): Promise<FeeConfiguration | null> {
    return this.feeConfigRepository.findOne({
      where: { effectiveFrom: LessThanOrEqual(now) },
      order: { effectiveFrom: 'DESC' },
    });
  }

  async updateConfiguration(
    payload: {
      feePercentage: number;
      minimumFeeXLM?: number | null;
      maximumFeeXLM?: number | null;
      waivedForVerifiedArtists?: boolean;
      effectiveFrom?: Date;
    },
    admin: User,
  ): Promise<FeeConfiguration> {
    const config = this.feeConfigRepository.create({
      feePercentage: payload.feePercentage.toString(),
      minimumFeeXLM:
        payload.minimumFeeXLM != null ? payload.minimumFeeXLM.toString() : null,
      maximumFeeXLM:
        payload.maximumFeeXLM != null ? payload.maximumFeeXLM.toString() : null,
      waivedForVerifiedArtists: payload.waivedForVerifiedArtists ?? false,
      effectiveFrom: payload.effectiveFrom ?? new Date(),
      createdById: admin.id,
    });

    return this.feeConfigRepository.save(config);
  }

  async recordFeeForTip(tip: Tip): Promise<PlatformFee> {
    const [config, artist] = await Promise.all([
      this.getActiveConfiguration(),
      this.artistRepository.findOne({ where: { id: tip.artistId } }),
    ]);

    const isVerifiedArtist = (artist as any)?.isVerified === true;

    let convertedAmountXLM: number | null = null;

    if (tip.assetCode !== 'XLM') {
      try {
        const conversion = await this.stellarService.getConversionRate(
          tip.assetCode,
          tip.assetIssuer || null,
          'XLM',
          null,
          tip.amount,
        );
        const estimated = conversion.estimatedAmount;
        const estimatedStr =
          typeof estimated === 'string' ? estimated : estimated.toString();
        convertedAmountXLM = parseFloat(estimatedStr);
      } catch {
        convertedAmountXLM = null;
      }
    }

    const calculated = this.feeCalculator.calculateFee(tip, config, {
      isVerifiedArtist,
      convertedAmountXLM,
    });

    const platformFee = this.platformFeeRepository.create({
      tipId: tip.id,
      feePercentage: calculated.feePercentage.toString(),
      feeAmountXLM: calculated.feeAmountXLM.toString(),
      feeAmountUSD:
        calculated.feeAmountUSD != null ? calculated.feeAmountUSD.toString() : null,
      collectionStatus: calculated.waived
        ? FeeCollectionStatus.WAIVED
        : FeeCollectionStatus.PENDING,
      stellarTxHash: tip.stellarTxHash,
    });

    return this.platformFeeRepository.save(platformFee);
  }

  async getFeeByTipId(tipId: string): Promise<PlatformFee | null> {
    return this.platformFeeRepository.findOne({
      where: { tipId },
      relations: ['tip'],
    });
  }

  async getLedger(
    period: string,
    page: number,
    limit: number,
  ): Promise<{ data: PlatformFee[]; total: number; page: number; limit: number }> {
    const qb = this.platformFeeRepository
      .createQueryBuilder('fee')
      .leftJoinAndSelect('fee.tip', 'tip')
      .orderBy('fee.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const now = new Date();
    let start: Date | null = null;

    if (period && period !== 'all') {
      const value = parseInt(period, 10);
      if (!isNaN(value)) {
        start = new Date(now.getTime() - value * 24 * 60 * 60 * 1000);
      }
    }

    if (start) {
      qb.andWhere('fee.createdAt >= :start', { start });
    }

    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, limit };
  }

  async getArtistSummary(artistId: string) {
    const qb = this.platformFeeRepository
      .createQueryBuilder('fee')
      .innerJoin('fee.tip', 'tip', 'tip.id = fee.tipId')
      .where('tip.artistId = :artistId', { artistId });

    const result = await qb
      .select([
        'COUNT(fee.id) as feeCount',
        'SUM(tip.amount) as grossAmountXLM',
        'SUM(fee.feeAmountXLM) as totalFeesXLM',
      ])
      .getRawOne();

    const grossAmountXLM = parseFloat(result.grossAmountXLM || 0);
    const totalFeesXLM = parseFloat(result.totalFeesXLM || 0);

    return {
      feeCount: parseInt(result.feeCount || 0, 10),
      grossAmountXLM,
      totalFeesXLM,
      netAmountXLM: grossAmountXLM - totalFeesXLM,
    };
  }

  async getPlatformTotals() {
    const qb = this.platformFeeRepository.createQueryBuilder('fee');

    const result = await qb
      .select([
        'COUNT(fee.id) as feeCount',
        'SUM(fee.feeAmountXLM) as totalFeesXLM',
        'SUM(fee.feeAmountUSD) as totalFeesUSD',
      ])
      .getRawOne();

    return {
      feeCount: parseInt(result.feeCount || 0, 10),
      totalFeesXLM: parseFloat(result.totalFeesXLM || 0),
      totalFeesUSD: parseFloat(result.totalFeesUSD || 0),
    };
  }
}
