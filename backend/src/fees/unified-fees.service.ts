import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  DataSource,
  MoreThanOrEqual,
  LessThanOrEqual,
} from 'typeorm';
import { UnifiedPlatformFee, FeeCollectionStatus } from './entities/unified-platform-fee.entity';
import { UnifiedFeeConfiguration } from './entities/unified-fee-configuration.entity';
import { UnifiedFeeCalculatorService, FeeCalculationInput } from './unified-fee-calculator.service';
import { StellarService } from '../stellar/stellar.service';
import { Artist } from '../artists/entities/artist.entity';
import { Tip } from '../tips/entities/tip.entity';

export interface RecordFeeInput {
  tipId: string;
  amountXLM: number;
  xlmToUsdRate?: number;
  isVerifiedArtist: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UpdateFeeConfigDto {
  feePercentage: number;
  minimumFeeXLM?: number | null;
  maximumFeeXLM?: number | null;
  waivedForVerifiedArtists?: boolean;
  effectiveFrom?: string;
}

export interface FeeLedgerQueryDto {
  page?: number;
  limit?: number;
  period?: string;
}

@Injectable()
export class UnifiedFeesService {
  private readonly logger = new Logger(UnifiedFeesService.name);

  constructor(
    @InjectRepository(UnifiedPlatformFee)
    private readonly platformFeeRepo: Repository<UnifiedPlatformFee>,
    @InjectRepository(UnifiedFeeConfiguration)
    private readonly feeConfigRepo: Repository<UnifiedFeeConfiguration>,
    @InjectRepository(Artist)
    private readonly artistRepo: Repository<Artist>,
    private readonly feeCalculator: UnifiedFeeCalculatorService,
    private readonly stellarService: StellarService,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Configuration Management ─────────────────────────────────────────────────────

  async getActiveConfiguration(): Promise<UnifiedFeeConfiguration> {
    const config = await this.feeConfigRepo.findOne({
      where: { effectiveFrom: LessThanOrEqual(new Date()) },
      order: { effectiveFrom: 'DESC' },
    });

    if (!config) {
      // Return sensible defaults if no config exists
      const defaults = new UnifiedFeeConfiguration();
      defaults.feePercentage = 2.5;
      defaults.minimumFeeXLM = 0.1;
      defaults.maximumFeeXLM = 100;
      defaults.waivedForVerifiedArtists = false;
      defaults.effectiveFrom = new Date(0);
      defaults.createdBy = 'system';
      return defaults;
    }

    return config;
  }

  async updateConfiguration(
    dto: UpdateFeeConfigDto,
    adminUserId: string,
  ): Promise<UnifiedFeeConfiguration> {
    // Validate min/max relationship
    if (dto.minimumFeeXLM && dto.maximumFeeXLM && dto.minimumFeeXLM > dto.maximumFeeXLM) {
      throw new BadRequestException('minimumFeeXLM cannot exceed maximumFeeXLM');
    }

    // Always create a new record — never overwrite historical configs
    const newConfig = this.feeConfigRepo.create({
      feePercentage: dto.feePercentage,
      minimumFeeXLM: dto.minimumFeeXLM,
      maximumFeeXLM: dto.maximumFeeXLM,
      waivedForVerifiedArtists: dto.waivedForVerifiedArtists ?? false,
      effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date(),
      createdBy: adminUserId,
    });

    const saved = await this.feeConfigRepo.save(newConfig);
    this.logger.log(
      `Fee configuration updated by admin ${adminUserId}: ${JSON.stringify(saved)}`,
    );
    return saved;
  }

  async getConfigurationHistory(): Promise<UnifiedFeeConfiguration[]> {
    return this.feeConfigRepo.find({ order: { effectiveFrom: 'DESC' } });
  }

  // ─── Fee Recording ───────────────────────────────────────────────────────────────

  async recordFeeForTip(tip: Tip): Promise<UnifiedPlatformFee> {
    const [config, artist] = await Promise.all([
      this.getActiveConfiguration(),
      this.artistRepo.findOne({ where: { id: tip.artistId } }),
    ]);

    const isVerifiedArtist = (artist as any)?.isVerified === true;

    let convertedAmountXLM: number | null = null;
    let xlmToUsdRate: number | undefined;

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
        
        // Get USD rate for fee calculation
        const usdConversion = await this.stellarService.getConversionRate(
          'XLM',
          null,
          'USD',
          null,
          convertedAmountXLM,
        );
        const usdEstimated = usdConversion.estimatedAmount;
        const usdEstimatedStr =
          typeof usdEstimated === 'string' ? usdEstimated : usdEstimated.toString();
        xlmToUsdRate = parseFloat(usdEstimatedStr) / convertedAmountXLM;
      } catch {
        convertedAmountXLM = null;
        xlmToUsdRate = undefined;
      }
    }

    const tipAmountXLM = convertedAmountXLM || parseFloat(tip.amount.toString());

    const input: FeeCalculationInput = {
      amountXLM: tipAmountXLM,
      xlmToUsdRate,
      isVerifiedArtist,
      config,
    };

    const result = this.feeCalculator.calculate(input);

    const fee = this.platformFeeRepo.create({
      tipId: tip.id,
      feePercentage: result.feePercentage,
      feeAmountXLM: result.feeAmountXLM,
      feeAmountUSD: result.feeAmountUSD,
      collectionStatus: result.isWaived
        ? FeeCollectionStatus.WAIVED
        : FeeCollectionStatus.PENDING,
      stellarTxHash: tip.stellarTxHash,
    });

    return this.platformFeeRepo.save(fee);
  }

  async markFeeCollected(
    feeId: string,
    stellarTxHash: string,
  ): Promise<UnifiedPlatformFee> {
    const fee = await this.platformFeeRepo.findOne({ where: { id: feeId } });
    if (!fee) throw new NotFoundException(`PlatformFee ${feeId} not found`);
    if (fee.collectionStatus === FeeCollectionStatus.WAIVED) {
      throw new BadRequestException('Cannot collect a waived fee');
    }

    fee.collectionStatus = FeeCollectionStatus.COLLECTED;
    fee.stellarTxHash = stellarTxHash;
    fee.collectedAt = new Date();
    return this.platformFeeRepo.save(fee);
  }

  // ─── Query Operations ───────────────────────────────────────────────────────────

  async getFeeByTipId(tipId: string): Promise<UnifiedPlatformFee> {
    const fee = await this.platformFeeRepo.findOne({ 
      where: { tipId },
      relations: ['tip'],
    });
    if (!fee) {
      throw new NotFoundException(`No fee record found for tip ${tipId}`);
    }
    return fee;
  }

  async getFeeLedger(
    query: FeeLedgerQueryDto,
  ): Promise<PaginatedResult<UnifiedPlatformFee>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.platformFeeRepo.createQueryBuilder('fee')
      .leftJoinAndSelect('fee.tip', 'tip');

    if (query.period) {
      const since = this.feeCalculator.parsePeriodToDate(query.period);
      qb.where('fee.createdAt >= :since', { since });
    }

    qb.orderBy('fee.createdAt', 'DESC').skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getPlatformTotals(period?: string): Promise<{
    totalFeesXLM: number;
    totalFeesUSD: number;
    totalCollected: number;
    totalPending: number;
    totalWaived: number;
    totalTransactions: number;
    averageFeeXLM: number;
    averageFeePercentage: number;
  }> {
    const qb = this.platformFeeRepo
      .createQueryBuilder('fee')
      .select('SUM(CAST(fee.feeAmountXLM AS DECIMAL))', 'totalFeesXLM')
      .addSelect('SUM(CAST(fee.feeAmountUSD AS DECIMAL))', 'totalFeesUSD')
      .addSelect(
        `SUM(CASE WHEN fee.collectionStatus = 'collected' THEN CAST(fee.feeAmountXLM AS DECIMAL) ELSE 0 END)`,
        'totalCollected',
      )
      .addSelect(
        `SUM(CASE WHEN fee.collectionStatus = 'pending' THEN CAST(fee.feeAmountXLM AS DECIMAL) ELSE 0 END)`,
        'totalPending',
      )
      .addSelect(
        `SUM(CASE WHEN fee.collectionStatus = 'waived' THEN CAST(fee.feeAmountXLM AS DECIMAL) ELSE 0 END)`,
        'totalWaived',
      )
      .addSelect('COUNT(*)', 'totalTransactions')
      .addSelect('AVG(CAST(fee.feeAmountXLM AS DECIMAL))', 'averageFeeXLM')
      .addSelect(
        'AVG(CAST(fee.feePercentage AS DECIMAL))',
        'averageFeePercentage',
      );

    if (period) {
      const since = this.feeCalculator.parsePeriodToDate(period);
      qb.where('fee.createdAt >= :since', { since });
    }

    const raw = await qb.getRawOne();

    return {
      totalFeesXLM: parseFloat(raw.totalFeesXLM ?? '0'),
      totalFeesUSD: parseFloat(raw.totalFeesUSD ?? '0'),
      totalCollected: parseFloat(raw.totalCollected ?? '0'),
      totalPending: parseFloat(raw.totalPending ?? '0'),
      totalWaived: parseFloat(raw.totalWaived ?? '0'),
      totalTransactions: parseInt(raw.totalTransactions ?? '0', 10),
      averageFeeXLM: parseFloat(raw.averageFeeXLM ?? '0'),
      averageFeePercentage: parseFloat(raw.averageFeePercentage ?? '0'),
    };
  }

  async getArtistFeeSummary(artistId: string): Promise<{
    artistId: string;
    totalFeesXLM: number;
    totalFeesUSD: number;
    waivedCount: number;
    collectedCount: number;
    pendingCount: number;
    totalTips: number;
  }> {
    // Join through tips table to get artist-specific fees
    const raw = await this.dataSource.query(
      `
      SELECT
        COUNT(pf.id) AS "totalTips",
        SUM(CAST(pf.fee_amount_xlm AS DECIMAL)) AS "totalFeesXLM",
        SUM(CAST(pf.fee_amount_usd AS DECIMAL)) AS "totalFeesUSD",
        SUM(CASE WHEN pf.collection_status = 'waived' THEN 1 ELSE 0 END) AS "waivedCount",
        SUM(CASE WHEN pf.collection_status = 'collected' THEN 1 ELSE 0 END) AS "collectedCount",
        SUM(CASE WHEN pf.collection_status = 'pending' THEN 1 ELSE 0 END) AS "pendingCount"
      FROM platform_fees pf
      INNER JOIN tips t ON t.id = pf.tip_id
      WHERE t.artist_id = $1
      `,
      [artistId],
    );

    const row = raw[0] ?? {};
    return {
      artistId,
      totalFeesXLM: parseFloat(row.totalFeesXLM ?? '0'),
      totalFeesUSD: parseFloat(row.totalFeesUSD ?? '0'),
      waivedCount: parseInt(row.waivedCount ?? '0', 10),
      collectedCount: parseInt(row.collectedCount ?? '0', 10),
      pendingCount: parseInt(row.pendingCount ?? '0', 10),
      totalTips: parseInt(row.totalTips ?? '0', 10),
    };
  }
}
