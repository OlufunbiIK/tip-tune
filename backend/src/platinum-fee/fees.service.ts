import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { PlatformFee, FeeCollectionStatus } from './entities/platform-fee.entity';
import { FeeConfiguration } from './entities/fee-configuration.entity';
import { FeeCalculatorService } from './fee-calculator.service';
import { UpdateFeeConfigDto, FeeLedgerQueryDto } from './dto/update-fee-config.dto';

export interface RecordFeeInput {
  tipId: string;
  amountXLM: number;
  xlmToUsdRate: number;
  isVerifiedArtist: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class FeesService {
  private readonly logger = new Logger(FeesService.name);

  constructor(
    @InjectRepository(PlatformFee)
    private readonly platformFeeRepo: Repository<PlatformFee>,
    @InjectRepository(FeeConfiguration)
    private readonly feeConfigRepo: Repository<FeeConfiguration>,
    private readonly feeCalculator: FeeCalculatorService,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Configuration ────────────────────────────────────────────────────────

  async getActiveConfiguration(): Promise<FeeConfiguration> {
    const config = await this.feeConfigRepo.findOne({
      where: { effectiveFrom: LessThanOrEqual(new Date()) },
      order: { effectiveFrom: 'DESC' },
    });

    if (!config) {
      // Return sensible defaults if no config exists
      const defaults = new FeeConfiguration();
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
  ): Promise<FeeConfiguration> {
    if (Number(dto.minimumFeeXLM) > Number(dto.maximumFeeXLM)) {
      throw new BadRequestException('minimumFeeXLM cannot exceed maximumFeeXLM');
    }

    // Always create a new record — never overwrite historical configs
    const newConfig = this.feeConfigRepo.create({
      feePercentage: dto.feePercentage,
      minimumFeeXLM: dto.minimumFeeXLM,
      maximumFeeXLM: dto.maximumFeeXLM,
      waivedForVerifiedArtists: dto.waivedForVerifiedArtists,
      effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date(),
      createdBy: adminUserId,
    });

    const saved = await this.feeConfigRepo.save(newConfig);
    this.logger.log(`Fee configuration updated by admin ${adminUserId}: ${JSON.stringify(saved)}`);
    return saved;
  }

  async getConfigurationHistory(): Promise<FeeConfiguration[]> {
    return this.feeConfigRepo.find({ order: { effectiveFrom: 'DESC' } });
  }

  // ─── Fee Recording ────────────────────────────────────────────────────────

  async recordFeeForTip(input: RecordFeeInput): Promise<PlatformFee> {
    const config = await this.getActiveConfiguration();
    const result = this.feeCalculator.calculate({
      amountXLM: input.amountXLM,
      xlmToUsdRate: input.xlmToUsdRate,
      isVerifiedArtist: input.isVerifiedArtist,
      config,
    });

    const fee = this.platformFeeRepo.create({
      tipId: input.tipId,
      feePercentage: result.feePercentage,
      feeAmountXLM: result.feeAmountXLM,
      feeAmountUSD: result.feeAmountUSD,
      collectionStatus: result.isWaived
        ? FeeCollectionStatus.WAIVED
        : FeeCollectionStatus.PENDING,
    });

    return this.platformFeeRepo.save(fee);
  }

  async markFeeCollected(
    feeId: string,
    stellarTxHash: string,
  ): Promise<PlatformFee> {
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

  // ─── Queries ──────────────────────────────────────────────────────────────

  async getFeeByTipId(tipId: string): Promise<PlatformFee> {
    const fee = await this.platformFeeRepo.findOne({ where: { tipId } });
    if (!fee) throw new NotFoundException(`No fee record found for tip ${tipId}`);
    return fee;
  }

  async getFeeLedger(query: FeeLedgerQueryDto): Promise<PaginatedResult<PlatformFee>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.platformFeeRepo.createQueryBuilder('fee');

    if (query.period) {
      const since = this.feeCalculator.parsePeriodToDate(query.period);
      qb.where('fee.created_at >= :since', { since });
    }

    qb.orderBy('fee.created_at', 'DESC').skip(skip).take(limit);

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
      .select('SUM(CAST(fee.fee_amount_xlm AS DECIMAL))', 'totalFeesXLM')
      .addSelect('SUM(CAST(fee.fee_amount_usd AS DECIMAL))', 'totalFeesUSD')
      .addSelect(
        `SUM(CASE WHEN fee.collection_status = 'collected' THEN CAST(fee.fee_amount_xlm AS DECIMAL) ELSE 0 END)`,
        'totalCollected',
      )
      .addSelect(
        `SUM(CASE WHEN fee.collection_status = 'pending' THEN CAST(fee.fee_amount_xlm AS DECIMAL) ELSE 0 END)`,
        'totalPending',
      )
      .addSelect(
        `SUM(CASE WHEN fee.collection_status = 'waived' THEN CAST(fee.fee_amount_xlm AS DECIMAL) ELSE 0 END)`,
        'totalWaived',
      )
      .addSelect('COUNT(*)', 'totalTransactions')
      .addSelect('AVG(CAST(fee.fee_amount_xlm AS DECIMAL))', 'averageFeeXLM')
      .addSelect('AVG(CAST(fee.fee_percentage AS DECIMAL))', 'averageFeePercentage');

    if (period) {
      const since = this.feeCalculator.parsePeriodToDate(period);
      qb.where('fee.created_at >= :since', { since });
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
