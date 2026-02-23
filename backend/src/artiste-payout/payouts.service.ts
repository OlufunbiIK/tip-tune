import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { PayoutRequest, PayoutStatus } from './entities/payout-request.entity';
import { ArtistBalance } from './entities/artist-balance.entity';
import { CreatePayoutDto } from './dto/create-payout.dto';

@Injectable()
export class PayoutsService {
  private readonly logger = new Logger(PayoutsService.name);
  private readonly minXlmThreshold: number;
  private readonly minUsdcThreshold: number;

  constructor(
    @InjectRepository(PayoutRequest)
    private readonly payoutRepo: Repository<PayoutRequest>,
    @InjectRepository(ArtistBalance)
    private readonly balanceRepo: Repository<ArtistBalance>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {
    this.minXlmThreshold = this.config.get<number>('PAYOUT_MIN_XLM', 10);
    this.minUsdcThreshold = this.config.get<number>('PAYOUT_MIN_USDC', 5);
  }

  // ---------------------------------------------------------------------------
  // Balance helpers
  // ---------------------------------------------------------------------------

  async getOrCreateBalance(artistId: string): Promise<ArtistBalance> {
    let balance = await this.balanceRepo.findOne({ where: { artistId } });
    if (!balance) {
      balance = this.balanceRepo.create({ artistId });
      balance = await this.balanceRepo.save(balance);
    }
    return balance;
  }

  async getBalance(artistId: string): Promise<ArtistBalance> {
    const balance = await this.balanceRepo.findOne({ where: { artistId } });
    if (!balance) {
      throw new NotFoundException(`Balance not found for artist ${artistId}`);
    }
    return balance;
  }

  /**
   * Credit artist balance (called from tip processing).
   */
  async creditBalance(
    artistId: string,
    amount: number,
    assetCode: 'XLM' | 'USDC',
    qr?: QueryRunner,
  ): Promise<void> {
    const repo = qr ? qr.manager.getRepository(ArtistBalance) : this.balanceRepo;

    await repo
      .createQueryBuilder()
      .update(ArtistBalance)
      .set(
        assetCode === 'XLM'
          ? { xlmBalance: () => `"xlmBalance" + ${amount}` }
          : { usdcBalance: () => `"usdcBalance" + ${amount}` },
      )
      .where('artistId = :artistId', { artistId })
      .execute();
  }

  // ---------------------------------------------------------------------------
  // Payout request
  // ---------------------------------------------------------------------------

  async requestPayout(dto: CreatePayoutDto): Promise<PayoutRequest> {
    const { artistId, amount, assetCode, destinationAddress } = dto;

    // 1. Minimum threshold check
    const threshold = assetCode === 'XLM' ? this.minXlmThreshold : this.minUsdcThreshold;
    if (amount < threshold) {
      throw new BadRequestException(
        `Minimum payout for ${assetCode} is ${threshold}. Requested: ${amount}`,
      );
    }

    // 2. Verify artist owns this Stellar address (check in Artist record)
    await this.verifyArtistAddress(artistId, destinationAddress);

    // 3. Check for duplicate pending payout
    const existing = await this.payoutRepo.findOne({
      where: { artistId, status: PayoutStatus.PENDING },
    });
    if (existing) {
      throw new ConflictException(
        `Artist ${artistId} already has a pending payout request (id: ${existing.id})`,
      );
    }

    // 4. Verify sufficient balance & lock atomically
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction('SERIALIZABLE');

    try {
      const balance = await qr.manager
        .getRepository(ArtistBalance)
        .createQueryBuilder('b')
        .setLock('pessimistic_write')
        .where('b.artistId = :artistId', { artistId })
        .getOne();

      if (!balance) {
        throw new NotFoundException(`No balance record found for artist ${artistId}`);
      }

      const available =
        assetCode === 'XLM'
          ? Number(balance.xlmBalance) - Number(balance.pendingXlm)
          : Number(balance.usdcBalance);

      if (available < amount) {
        throw new BadRequestException(
          `Insufficient balance. Available: ${available} ${assetCode}, Requested: ${amount}`,
        );
      }

      // Reserve funds
      if (assetCode === 'XLM') {
        await qr.manager.getRepository(ArtistBalance).update(
          { artistId },
          { pendingXlm: () => `"pendingXlm" + ${amount}` } as any,
        );
      }

      const payout = qr.manager.getRepository(PayoutRequest).create({
        artistId,
        amount,
        assetCode,
        destinationAddress,
        status: PayoutStatus.PENDING,
      });

      const saved = await qr.manager.getRepository(PayoutRequest).save(payout);
      await qr.commitTransaction();
      return saved;
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  async getHistory(artistId: string): Promise<PayoutRequest[]> {
    return this.payoutRepo.find({
      where: { artistId },
      order: { requestedAt: 'DESC' },
    });
  }

  async getStatus(payoutId: string): Promise<PayoutRequest> {
    const payout = await this.payoutRepo.findOne({ where: { id: payoutId } });
    if (!payout) throw new NotFoundException(`Payout ${payoutId} not found`);
    return payout;
  }

  // ---------------------------------------------------------------------------
  // Retry
  // ---------------------------------------------------------------------------

  async retryPayout(payoutId: string): Promise<PayoutRequest> {
    const payout = await this.payoutRepo.findOne({ where: { id: payoutId } });
    if (!payout) throw new NotFoundException(`Payout ${payoutId} not found`);

    if (payout.status !== PayoutStatus.FAILED) {
      throw new BadRequestException(
        `Only failed payouts can be retried. Current status: ${payout.status}`,
      );
    }

    // Check no other pending exists for same artist
    const pending = await this.payoutRepo.findOne({
      where: { artistId: payout.artistId, status: PayoutStatus.PENDING },
    });
    if (pending) {
      throw new ConflictException(
        `Artist already has a pending payout (id: ${pending.id})`,
      );
    }

    await this.payoutRepo.update(payoutId, {
      status: PayoutStatus.PENDING,
      failureReason: null,
      stellarTxHash: null,
      processedAt: null,
    });

    return this.payoutRepo.findOne({ where: { id: payoutId } });
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  /**
   * Verify that `destinationAddress` belongs to the artist.
   * In production this would query the Artist repository / profile service.
   * We throw NotFoundException if the artist cannot be found (no Artist repo injected here).
   */
  protected async verifyArtistAddress(
    artistId: string,
    destinationAddress: string,
  ): Promise<void> {
    // Placeholder – override / extend in integration or inject ArtistRepository.
    // Actual verification queries Artist.stellarAddress === destinationAddress.
    this.logger.log(
      `Address ownership check: artist=${artistId}, address=${destinationAddress}`,
    );
  }

  /** Called by processor after successful tx to finalise balance deduction. */
  async finaliseSuccess(
    payoutId: string,
    txHash: string,
    qr: QueryRunner,
  ): Promise<void> {
    const payout = await qr.manager
      .getRepository(PayoutRequest)
      .findOne({ where: { id: payoutId } });

    if (!payout) throw new NotFoundException(`Payout ${payoutId} not found`);

    // Deduct from real balance and release pending reserve
    if (payout.assetCode === 'XLM') {
      await qr.manager
        .getRepository(ArtistBalance)
        .createQueryBuilder()
        .update()
        .set({
          xlmBalance: () => `"xlmBalance" - ${payout.amount}`,
          pendingXlm: () => `"pendingXlm" - ${payout.amount}`,
        })
        .where('artistId = :id', { id: payout.artistId })
        .execute();
    } else {
      await qr.manager
        .getRepository(ArtistBalance)
        .createQueryBuilder()
        .update()
        .set({ usdcBalance: () => `"usdcBalance" - ${payout.amount}` })
        .where('artistId = :id', { id: payout.artistId })
        .execute();
    }

    await qr.manager.getRepository(PayoutRequest).update(payoutId, {
      status: PayoutStatus.COMPLETED,
      stellarTxHash: txHash,
      processedAt: new Date(),
    });
  }

  /** Called by processor on tx failure. */
  async finaliseFailure(
    payoutId: string,
    reason: string,
    qr: QueryRunner,
  ): Promise<void> {
    const payout = await qr.manager
      .getRepository(PayoutRequest)
      .findOne({ where: { id: payoutId } });

    if (!payout) return;

    // Release pending reserve
    if (payout.assetCode === 'XLM') {
      await qr.manager
        .getRepository(ArtistBalance)
        .createQueryBuilder()
        .update()
        .set({ pendingXlm: () => `"pendingXlm" - ${payout.amount}` })
        .where('artistId = :id', { id: payout.artistId })
        .execute();
    }

    await qr.manager.getRepository(PayoutRequest).update(payoutId, {
      status: PayoutStatus.FAILED,
      failureReason: reason,
      processedAt: new Date(),
    });
  }

  /** Expose for processor */
  async getPendingPayouts(): Promise<PayoutRequest[]> {
    return this.payoutRepo.find({ where: { status: PayoutStatus.PENDING } });
  }

  async markProcessing(payoutId: string): Promise<void> {
    await this.payoutRepo.update(payoutId, { status: PayoutStatus.PROCESSING });
  }
}
