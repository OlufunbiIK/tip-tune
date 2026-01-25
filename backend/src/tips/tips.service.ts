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
import { Tip, TipStatus } from "./tips.entity";
import { CreateTipDto } from "./create-tips.dto";
import { PaginationQueryDto, PaginatedResponseDto } from "./pagination.dto";
import { StellarService } from "../stellar/stellar.service";
import { UsersService } from "../users/users.service";
import { NotificationsService } from "../notifications/notifications.service";
import { ActivitiesService } from "../activities/activities.service";

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
  ) {}

  async create(userId: string, createTipDto: CreateTipDto): Promise<Tip> {
    const { artistId, trackId, stellarTxHash, message } = createTipDto;

    // 1. Check if tip already exists
    const existingTip = await this.tipRepository.findOne({
      where: { stellarTxHash },
    });

    if (existingTip) {
      throw new ConflictException(
        "Tip with this Stellar transaction hash already exists",
      );
    }

    // 2. Validate users
    if (userId === artistId) {
      throw new BadRequestException("Cannot tip yourself");
    }

    // Fetch artist to get wallet address
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

    // 3. Verify transaction on Stellar
    let txDetails;
    try {
      txDetails =
        await this.stellarService.getTransactionDetails(stellarTxHash);
    } catch (e) {
      throw new BadRequestException(
        `Invalid Stellar transaction hash: ${e.message}`,
      );
    }

    if (!txDetails.successful) {
      throw new BadRequestException("Stellar transaction failed on-chain");
    }

    const operations = await txDetails.operations();
    // Find payment to artist
    const paymentOp: any = operations.records.find(
      (op: any) =>
        op.type === "payment" &&
        op.to === artist.walletAddress &&
        (op.asset_type === "native" || op.asset_code === "USDC"),
    );

    if (!paymentOp) {
      throw new BadRequestException(
        "Transaction does not contain a valid payment to the artist",
      );
    }

    const amount = paymentOp.amount;

    // Create Tip entity
    const tip = this.tipRepository.create({
      fromUserId: userId,
      toArtistId: artistId,
      trackId,
      amount: parseFloat(amount),
      stellarTxHash,
      message,
      status: TipStatus.COMPLETED,
      // usdValue can be updated later via a price service
    });

    const savedTip = await this.tipRepository.save(tip);

    // Emit WebSocket notification
    this.notificationsService.notifyArtistOfTip(artistId, savedTip);

    // Track activities
    try {
      // Track tip sent activity for the sender
      await this.activitiesService.trackTipSent(userId, savedTip.id, {
        amount: savedTip.amount,
        toArtistId: artistId,
        trackId: trackId,
        message: message,
      });

      // Track tip received activity for the artist
      await this.activitiesService.trackTipReceived(artistId, savedTip.id, {
        amount: savedTip.amount,
        fromUserId: userId,
        trackId: trackId,
        message: message,
      });
    } catch (error) {
      // Log but don't fail tip creation if activity tracking fails
      this.logger.warn(`Failed to track activities for tip: ${error.message}`);
    }

    return savedTip;
  }

  async findOne(id: string): Promise<Tip> {
    const tip = await this.tipRepository.findOne({
      where: { id },
      relations: ["fromUser", "toArtist", "track"],
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
      .leftJoinAndSelect("tip.toArtist", "artist")
      .leftJoinAndSelect("tip.track", "track")
      .where("tip.fromUserId = :userId", { userId })
      .orderBy("tip.createdAt", "DESC")
      .skip(skip)
      .take(limit);

    if (status) {
      queryBuilder.andWhere("tip.status = :status", { status });
    }

    const [data, total] = await queryBuilder.getManyAndCount();

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
      .where("tip.toArtistId = :artistId", { artistId })
      .orderBy("tip.createdAt", "DESC")
      .skip(skip)
      .take(limit);

    if (status) {
      queryBuilder.andWhere("tip.status = :status", { status });
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    return this.createPaginatedResponse(data, total, page, limit);
  }

  async updateTipStatus(id: string, status: TipStatus): Promise<Tip> {
    const tip = await this.findOne(id);
    tip.status = status;
    return this.tipRepository.save(tip);
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
      .leftJoinAndSelect("tip.toArtist", "artist")
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
      .andWhere("tip.status = :status", { status: TipStatus.COMPLETED })
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
