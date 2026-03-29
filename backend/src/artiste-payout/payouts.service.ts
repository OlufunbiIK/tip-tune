import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource, QueryRunner } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { ArtistBalance } from "./artist-balance.entity";
import { ArtistBalanceAudit, ArtistBalanceAuditType } from "./artist-balance-audit.entity";
import { PayoutRequest, PayoutStatus } from "./payout-request.entity";
import { CreatePayoutDto } from "./create-payout.dto";
import { Artist } from "../artists/entities/artist.entity";

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
    @InjectRepository(ArtistBalanceAudit)
    private readonly auditRepo: Repository<ArtistBalanceAudit>,
    @InjectRepository(Artist)
    private readonly artistRepo: Repository<Artist>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {
    this.minXlmThreshold = this.config.get<number>("PAYOUT_MIN_XLM", 10);
    this.minUsdcThreshold = this.config.get<number>("PAYOUT_MIN_USDC", 5);
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

  async getBalance(
    requestingUserId: string,
    artistId: string,
  ): Promise<ArtistBalance> {
    await this.assertArtistOwnership(requestingUserId, artistId);

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
    assetCode: "XLM" | "USDC",
    qr?: QueryRunner,
  ): Promise<void> {
    const repo = qr
      ? qr.manager.getRepository(ArtistBalance)
      : this.balanceRepo;

    const existing = await repo.findOne({ where: { artistId } });
    if (!existing) {
      throw new NotFoundException(`Balance not found for artist ${artistId}`);
    }

    const beforeBalance =
      assetCode === "XLM" ? Number(existing.xlmBalance) : Number(existing.usdcBalance);

    await repo
      .createQueryBuilder()
      .update(ArtistBalance)
      .set(
        assetCode === "XLM"
          ? { xlmBalance: () => `"xlmBalance" + ${amount}` }
          : { usdcBalance: () => `"usdcBalance" + ${amount}` },
      )
      .where("artistId = :artistId", { artistId })
      .execute();

    const after = await repo.findOne({ where: { artistId } });
    if (after) {
      await this.auditRepo.save(
        this.auditRepo.create({
          artistId,
          assetCode,
          eventType: ArtistBalanceAuditType.TIP_CREDIT,
          amount,
          balanceBefore: beforeBalance,
          balanceAfter:
            assetCode === "XLM" ? Number(after.xlmBalance) : Number(after.usdcBalance),
          pendingBefore: assetCode === "XLM" ? Number(existing.pendingXlm) : Number(existing.pendingUsdc),
          pendingAfter: assetCode === "XLM" ? Number(after.pendingXlm) : Number(after.pendingUsdc),
        }),
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Payout request
  // ---------------------------------------------------------------------------

  async requestPayout(
    requestingUserId: string,
    dto: CreatePayoutDto,
  ): Promise<PayoutRequest> {
    const { artistId, amount, assetCode, destinationAddress } = dto;
    const artist = await this.assertArtistOwnership(requestingUserId, artistId);

    // 1. Minimum threshold check
    const threshold =
      assetCode === "XLM" ? this.minXlmThreshold : this.minUsdcThreshold;
    if (amount < threshold) {
      throw new BadRequestException(
        `Minimum payout for ${assetCode} is ${threshold}. Requested: ${amount}`,
      );
    }

    // 2. Verify artist owns this Stellar address via the artist profile.
    await this.verifyArtistAddress(artist, destinationAddress);

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
    await qr.startTransaction("SERIALIZABLE");

    try {
      const balance = await qr.manager
        .getRepository(ArtistBalance)
        .createQueryBuilder("b")
        .setLock("pessimistic_write")
        .where("b.artistId = :artistId", { artistId })
        .getOne();

      if (!balance) {
        throw new NotFoundException(
          `No balance record found for artist ${artistId}`,
        );
      }

      const available =
        assetCode === "XLM"
          ? Number(balance.xlmBalance) - Number(balance.pendingXlm)
          : Number(balance.usdcBalance) - Number(balance.pendingUsdc);

      if (available < amount) {
        throw new BadRequestException(
          `Insufficient balance. Available: ${available} ${assetCode}, Requested: ${amount}`,
        );
      }

      // Reserve funds
      if (assetCode === "XLM") {
        await qr.manager
          .getRepository(ArtistBalance)
          .update({ artistId }, {
            pendingXlm: () => `"pendingXlm" + ${amount}`,
          } as any);
      } else {
        await qr.manager
          .getRepository(ArtistBalance)
          .update({ artistId }, {
            pendingUsdc: () => `"pendingUsdc" + ${amount}`,
          } as any);
      }

      const payout = qr.manager.getRepository(PayoutRequest).create({
        artistId,
        amount,
        assetCode,
        destinationAddress,
        status: PayoutStatus.PENDING,
      });

      const saved = await qr.manager.getRepository(PayoutRequest).save(payout);

      // Settlement happens asynchronously through PayoutProcessorService.
      // This request only reserves balance and creates a pending payout.

      const afterBalance = await qr.manager
        .getRepository(ArtistBalance)
        .findOne({ where: { artistId } });

      if (afterBalance) {
        await this.auditRepo.save(
          this.auditRepo.create({
            artistId,
            assetCode,
            eventType: ArtistBalanceAuditType.PAYOUT_REQUEST,
            amount: amount * -1,
            payoutRequestId: saved.id,
            balanceBefore:
              assetCode === "XLM"
                ? Number(balance.xlmBalance)
                : Number(balance.usdcBalance),
            balanceAfter:
              assetCode === "XLM"
                ? Number(afterBalance.xlmBalance)
                : Number(afterBalance.usdcBalance),
            pendingBefore:
              assetCode === "XLM"
                ? Number(balance.pendingXlm)
                : Number(balance.pendingUsdc),
            pendingAfter:
              assetCode === "XLM"
                ? Number(afterBalance.pendingXlm)
                : Number(afterBalance.pendingUsdc),
          }),
        );
      }

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

  async getHistory(
    requestingUserId: string,
    artistId: string,
  ): Promise<PayoutRequest[]> {
    await this.assertArtistOwnership(requestingUserId, artistId);

    return this.payoutRepo.find({
      where: { artistId },
      order: { requestedAt: "DESC" },
    });
  }

  async getStatus(
    requestingUserId: string,
    payoutId: string,
  ): Promise<PayoutRequest> {
    const payout = await this.payoutRepo.findOne({ where: { id: payoutId } });
    if (!payout) throw new NotFoundException(`Payout ${payoutId} not found`);

    await this.assertArtistOwnership(requestingUserId, payout.artistId);

    return payout;
  }

  // ---------------------------------------------------------------------------
  // Retry
  // ---------------------------------------------------------------------------

  async retryPayout(
    requestingUserId: string,
    payoutId: string,
  ): Promise<PayoutRequest> {
    const payout = await this.payoutRepo.findOne({ where: { id: payoutId } });
    if (!payout) throw new NotFoundException(`Payout ${payoutId} not found`);

    await this.assertArtistOwnership(requestingUserId, payout.artistId);

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
   * Verify that `destinationAddress` belongs to the authenticated artist profile.
   */
  protected async verifyArtistAddress(
    artist: Artist,
    destinationAddress: string,
  ): Promise<void> {
    if (artist.walletAddress !== destinationAddress) {
      throw new ForbiddenException(
        "Payout destination must match the authenticated artist wallet address.",
      );
    }

    this.logger.log(
      `Verified payout wallet ownership for artist=${artist.id}, address=${destinationAddress}`,
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
    const currentBalance = await qr.manager
      .getRepository(ArtistBalance)
      .findOne({ where: { artistId: payout.artistId } });

    if (payout.assetCode === "XLM") {
      await qr.manager
        .getRepository(ArtistBalance)
        .createQueryBuilder()
        .update()
        .set({
          xlmBalance: () => `"xlmBalance" - ${payout.amount}`,
          pendingXlm: () => `"pendingXlm" - ${payout.amount}`,
        })
        .where("artistId = :id", { id: payout.artistId })
        .execute();
    } else {
      await qr.manager
        .getRepository(ArtistBalance)
        .createQueryBuilder()
        .update()
        .set({
          usdcBalance: () => `"usdcBalance" - ${payout.amount}`,
          pendingUsdc: () => `"pendingUsdc" - ${payout.amount}`,
        })
        .where("artistId = :id", { id: payout.artistId })
        .execute();
    }

    const updatedBalance = await qr.manager
      .getRepository(ArtistBalance)
      .findOne({ where: { artistId: payout.artistId } });

    if (currentBalance && updatedBalance) {
      await this.auditRepo.save(
        this.auditRepo.create({
          artistId: payout.artistId,
          assetCode: payout.assetCode,
          eventType: ArtistBalanceAuditType.PAYOUT_COMPLETED,
          amount: payout.amount * -1,
          payoutRequestId: payoutId,
          balanceBefore:
            payout.assetCode === "XLM"
              ? Number(currentBalance.xlmBalance)
              : Number(currentBalance.usdcBalance),
          balanceAfter:
            payout.assetCode === "XLM"
              ? Number(updatedBalance.xlmBalance)
              : Number(updatedBalance.usdcBalance),
          pendingBefore:
            payout.assetCode === "XLM"
              ? Number(currentBalance.pendingXlm)
              : Number(currentBalance.pendingUsdc),
          pendingAfter:
            payout.assetCode === "XLM"
              ? Number(updatedBalance.pendingXlm)
              : Number(updatedBalance.pendingUsdc),
        }),
      );
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

    const currentBalance = await qr.manager
      .getRepository(ArtistBalance)
      .findOne({ where: { artistId: payout.artistId } });

    if (payout.assetCode === "XLM") {
      await qr.manager
        .getRepository(ArtistBalance)
        .createQueryBuilder()
        .update()
        .set({ pendingXlm: () => `"pendingXlm" - ${payout.amount}` })
        .where("artistId = :id", { id: payout.artistId })
        .execute();
    } else {
      await qr.manager
        .getRepository(ArtistBalance)
        .createQueryBuilder()
        .update()
        .set({ pendingUsdc: () => `"pendingUsdc" - ${payout.amount}` })
        .where("artistId = :id", { id: payout.artistId })
        .execute();
    }

    const updatedBalance = await qr.manager
      .getRepository(ArtistBalance)
      .findOne({ where: { artistId: payout.artistId } });

    if (currentBalance && updatedBalance) {
      await this.auditRepo.save(
        this.auditRepo.create({
          artistId: payout.artistId,
          assetCode: payout.assetCode,
          eventType: ArtistBalanceAuditType.PAYOUT_FAILED,
          amount: 0,
          payoutRequestId: payoutId,
          balanceBefore:
            payout.assetCode === "XLM"
              ? Number(currentBalance.xlmBalance)
              : Number(currentBalance.usdcBalance),
          balanceAfter:
            payout.assetCode === "XLM"
              ? Number(updatedBalance.xlmBalance)
              : Number(updatedBalance.usdcBalance),
          pendingBefore:
            payout.assetCode === "XLM"
              ? Number(currentBalance.pendingXlm)
              : Number(currentBalance.pendingUsdc),
          pendingAfter:
            payout.assetCode === "XLM"
              ? Number(updatedBalance.pendingXlm)
              : Number(updatedBalance.pendingUsdc),
        }),
      );
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

  private async assertArtistOwnership(
    requestingUserId: string,
    artistId: string,
  ): Promise<Artist> {
    const artist = await this.artistRepo.findOne({
      where: { id: artistId, isDeleted: false },
    });

    if (!artist) {
      throw new NotFoundException(`Artist ${artistId} not found`);
    }

    if (artist.userId !== requestingUserId) {
      throw new ForbiddenException(
        "You can only manage payouts for your own artist profile.",
      );
    }

    return artist;
  }
}
