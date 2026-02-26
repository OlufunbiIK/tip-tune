import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Tip, TipStatus } from "./entities/tip.entity";
import { CreateTipDto } from "./create-tips.dto";
// Removed unused imports (PaginatedResponse, paginate) to satisfy ESLint
import { StellarService } from "../stellar/stellar.service";
import { UsersService } from "../users/users.service";
import { NotificationsService } from "../notifications/notifications.service";
import { ActivitiesService } from "../activities/activities.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { TipVerifiedEvent } from "./events/tip-verified.event";
import { NotificationType } from "../notifications/notification.entity";
import { FeesService } from "../fees/fees.service";
import { ModerationService } from "../moderation/moderation.service";
import { BlocksService } from "../blocks/blocks.service";
import { TipReconciliationService } from "./tip-reconciliation.service";

// Make sure to define PaginatedResponseDto locally or import it from the correct path if it exists
export interface PaginatedResponseDto<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// Add PaginationQueryDto interface since it was implicitly used
export interface PaginationQueryDto {
  page?: number;
  limit?: number;
  status?: string;
}

@Injectable()
export class TipsService {
  private readonly logger = new Logger(TipsService.name);

  constructor(
    @InjectRepository(Tip)
    private readonly tipRepository: Repository<Tip>,
    private readonly stellarService: StellarService,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
    @Inject(forwardRef(() => ActivitiesService))
    private readonly activitiesService: ActivitiesService,
    private readonly eventEmitter: EventEmitter2,
    private readonly feesService: FeesService,
    private readonly moderationService: ModerationService,
    private readonly blocksService: BlocksService,
    @Inject(forwardRef(() => TipReconciliationService))
    private readonly tipReconciliationService: TipReconciliationService,
  ) {}

  async create(userId: string, createTipDto: CreateTipDto): Promise<Tip> {
    const { artistId, trackId, stellarTxHash, message } = createTipDto;

    const existingTip = await this.tipRepository.findOne({
      where: { stellarTxHash },
    });

    if (existingTip) {
      throw new ConflictException(
        "Tip with this Stellar transaction hash already exists",
      );
    }

    if (userId === artistId) {
      throw new BadRequestException("Cannot tip yourself");
    }

    const isBlocked = await this.blocksService.isBlockedByArtist(
      artistId,
      userId,
    );
    if (isBlocked) {
      throw new BadRequestException(
        "You are blocked by this artist and cannot send tips",
      );
    }

    let artist;
    try {
      artist = await this.usersService.findOne(artistId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new BadRequestException("Artist not found");
      }
      throw error;
    }

    if (!artist.walletAddress) {
      throw new BadRequestException(
        "Artist does not have a wallet address configured",
      );
    }

    let txDetails;
    try {
      txDetails = await this.stellarService.getTransactionDetails(stellarTxHash);
    } catch (e: any) {
      throw new BadRequestException(
        `Invalid Stellar transaction hash: ${e.message}`,
      );
    }

    if (!txDetails.successful) {
      throw new BadRequestException("Stellar transaction failed on-chain");
    }

    const operations = await txDetails.operations();
    const paymentOp: any = operations.records.find((op: any) => {
      const isPayment =
        op.type === "payment" ||
        op.type === "path_payment_strict_send" ||
        op.type === "path_payment_strict_receive";
      return isPayment && op.to === artist.walletAddress;
    });

    if (!paymentOp) {
      throw new BadRequestException(
        "Transaction does not contain a valid payment to the artist",
      );
    }

    const amount = paymentOp.amount;
    const assetCode = paymentOp.asset_type === "native" ? "XLM" : paymentOp.asset_code;
    const assetIssuer = paymentOp.asset_issuer;
    const assetType = paymentOp.asset_type;

    let user = null;
    let senderAddress = 'anonymous';
    try {
      user = await this.usersService.findOne(userId);
      senderAddress = user.walletAddress;
    } catch (e) {
      // Keep senderAddress as 'anonymous'
    }
    const receiverAddress = artist.walletAddress;

    const newTip = this.tipRepository.create({
      artistId,
      trackId,
      stellarTxHash,
      senderAddress: senderAddress || "anonymous",
      receiverAddress,
      amount: parseFloat(amount),
      assetCode,
      assetIssuer,
      assetType,
      message,
      status: TipStatus.VERIFIED,
      verifiedAt: new Date(),
      stellarTimestamp: new Date(txDetails.created_at),
    });

    const savedTip = await this.tipRepository.save(newTip);

    await this.moderationService.moderateTipMessage(savedTip, artistId);
    await this.tipRepository.save(savedTip);

    await this.feesService.recordFeeForTip(savedTip);

    this.eventEmitter.emit(
      "tip.verified",
      new TipVerifiedEvent(savedTip, userId),
    );

    await this.notificationsService.create({
      userId: artistId,
      type: NotificationType.TIP_RECEIVED,
      title: "New Tip Received!",
      message: `You received a tip of ${amount} ${assetCode} from ${user?.username || "a fan"}`,
      data: { tipId: savedTip.id, amount, assetCode },
    });

    return savedTip;
  }

  async findOne(id: string): Promise<Tip> {
    const tip = await this.tipRepository.findOne({
      where: { id },
      relations: ["fromUser", "artist", "track"],
    });

    if (!tip) {
      throw new NotFoundException(`Tip with ID ${id} not found`);
    }

    return tip;
  }

  async getUserTipHistory(
    userId: string,
    paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<Tip>> {
    const { page = 1, limit = 10, status } = paginationQuery;
    const skip = (page - 1) * limit;

    const queryBuilder = this.tipRepository
      .createQueryBuilder("tip")
      .leftJoinAndSelect("tip.artist", "artist")
      .leftJoinAndSelect("tip.track", "track")
      .where("tip.fromUserId = :userId", { userId })
      .andWhere("artist.isDeleted = false")
      .orderBy("tip.createdAt", "DESC")
      .skip(skip)
      .take(limit);

    if (status) {
      queryBuilder.andWhere("tip.status = :status", { status });
    }

    // ESLint Fix: Separate the const array from the reassigned data variable
    const [originalData, total] = await queryBuilder.getManyAndCount();

    const data = originalData.map(tip => {
      if (tip.artist && tip.artist.isDeleted) {
        tip.artist = null;
      }
      return tip;
    });

    return this.createPaginatedResponse(data, total, page, limit);
  }

  async getArtistReceivedTips(
    artistId: string,
    paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<Tip>> {
    const { page = 1, limit = 10, status } = paginationQuery;
    const skip = (page - 1) * limit;

    const queryBuilder = this.tipRepository
      .createQueryBuilder("tip")
      .leftJoinAndSelect("tip.fromUser", "user")
      .leftJoinAndSelect("tip.track", "track")
      .where("tip.artistId = :artistId", { artistId })
      .andWhere("user.isDeleted = false")
      .orderBy("tip.createdAt", "DESC")
      .skip(skip)
      .take(limit);

    if (status) {
      queryBuilder.andWhere("tip.status = :status", { status });
    }

    // ESLint Fix: Separate the const array from the reassigned data variable
    const [originalData, total] = await queryBuilder.getManyAndCount();

    const data = originalData.map(tip => {
      if (tip.fromUser && tip.fromUser.isDeleted) {
        tip.fromUser = null;
        tip.senderAddress = 'anonymous';
      }
      return tip;
    });

    return this.createPaginatedResponse(data, total, page, limit);
  }

  async updateTipStatus(id: string, status: TipStatus): Promise<Tip> {
    const tip = await this.findOne(id);
    tip.status = status;
    const savedTip = await this.tipRepository.save(tip);

    if (tip.trackId && (status === TipStatus.FAILED || status === TipStatus.REVERSED)) {
      this.tipReconciliationService.reconcileTrack(tip.trackId).catch((err) => {
        this.logger.error(`Failed to reconcile track ${tip.trackId}:`, err);
      });
    }

    return savedTip;
  }

  async getTipsByTrack(
    trackId: string,
    paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<Tip>> {
    const { page = 1, limit = 10, status } = paginationQuery;
    const skip = (page - 1) * limit;

    const queryBuilder = this.tipRepository
      .createQueryBuilder("tip")
      .leftJoinAndSelect("tip.fromUser", "user")
      .leftJoinAndSelect("tip.artist", "artist")
      .where("tip.trackId = :trackId", { trackId })
      .orderBy("tip.createdAt", "DESC")
      .skip(skip)
      .take(limit);

    if (status) {
      queryBuilder.andWhere("tip.status = :status", { status });
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    return this.createPaginatedResponse(data, total, page, limit);
  }

  async getArtistTipStats(artistId: string): Promise<{
    totalTips: number;
    totalAmount: number;
    totalUsdValue: number;
    averageTip: number;
  }> {
    const result = await this.tipRepository
      .createQueryBuilder("tip")
      .select("COUNT(*)", "totalTips")
      .addSelect("SUM(tip.amount)", "totalAmount")
      .addSelect("SUM(tip.usdValue)", "totalUsdValue")
      .addSelect("AVG(tip.amount)", "averageTip")
      .where("tip.toArtistId = :artistId", { artistId })
      .andWhere("tip.status = :status", { status: TipStatus.VERIFIED })
      .getRawOne();

    return {
      totalTips: parseInt(result.totalTips) || 0,
      totalAmount: parseFloat(result.totalAmount) || 0,
      totalUsdValue: parseFloat(result.totalUsdValue) || 0,
      averageTip: parseFloat(result.averageTip) || 0,
    };
  }

  private createPaginatedResponse<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedResponseDto<T> {
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }
}