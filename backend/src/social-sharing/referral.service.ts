import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { OnEvent } from "@nestjs/event-emitter";
import { customAlphabet } from "nanoid";
import { ReferralCode } from "./referral-code.entity";
import { Referral } from "./referral.entity";
import { TipVerifiedEvent } from "../tips/events/tip-verified.event";
import {
  ApplyReferralResponseDto,
  GenerateReferralCodeDto,
  LeaderboardEntryDto,
  ReferralCodeResponseDto,
  ReferralStatsDto,
} from "./referral.dto";

const nanoid = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8);

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(
    @InjectRepository(ReferralCode)
    private readonly referralCodeRepo: Repository<ReferralCode>,
    @InjectRepository(Referral)
    private readonly referralRepo: Repository<Referral>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  // ─── Generate Code ────────────────────────────────────────────────────────

  async generateCode(
    userId: string,
    dto: GenerateReferralCodeDto,
  ): Promise<ReferralCodeResponseDto> {
    // Deactivate existing active codes for user
    await this.referralCodeRepo.update(
      { userId, isActive: true },
      { isActive: false },
    );

    let code: string;
    let attempts = 0;
    do {
      code = nanoid();
      attempts++;
      if (attempts > 10)
        throw new Error("Failed to generate unique referral code");
    } while (await this.referralCodeRepo.existsBy({ code }));

    const referralCode = this.referralCodeRepo.create({
      userId,
      code,
      rewardType: dto.rewardType,
      rewardValue: dto.rewardValue,
      maxUsages: dto.maxUsages ?? null,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      isActive: true,
      usageCount: 0,
    });

    const saved = await this.referralCodeRepo.save(referralCode);
    this.logger.log(`Generated referral code ${code} for user ${userId}`);
    return this.toCodeResponse(saved);
  }

  // ─── Get My Code ──────────────────────────────────────────────────────────

  async getMyCode(userId: string): Promise<ReferralCodeResponseDto> {
    const code = await this.referralCodeRepo.findOne({
      where: { userId, isActive: true },
      order: { createdAt: "DESC" },
    });

    if (!code) {
      throw new NotFoundException(
        "No active referral code found. Generate one first.",
      );
    }

    return this.toCodeResponse(code);
  }

  // ─── Apply Code ───────────────────────────────────────────────────────────

  async applyCode(
    code: string,
    referredUserId: string,
  ): Promise<ApplyReferralResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const referralCode = await queryRunner.manager.findOne(ReferralCode, {
        where: { code, isActive: true },
      });

      if (!referralCode) {
        throw new NotFoundException("Referral code not found or inactive.");
      }

      if (referralCode.userId === referredUserId) {
        throw new BadRequestException("You cannot use your own referral code.");
      }

      if (referralCode.expiresAt && referralCode.expiresAt < new Date()) {
        throw new BadRequestException("This referral code has expired.");
      }

      if (
        referralCode.maxUsages !== null &&
        referralCode.usageCount >= referralCode.maxUsages
      ) {
        throw new BadRequestException(
          "This referral code has reached its usage limit.",
        );
      }

      const existing = await queryRunner.manager.findOne(Referral, {
        where: { referredUserId },
      });

      if (existing) {
        throw new ConflictException(
          "You have already been referred by another user.",
        );
      }

      const referral = queryRunner.manager.create(Referral, {
        referrerId: referralCode.userId,
        referredUserId,
        referralCodeId: referralCode.id,
        rewardClaimed: false,
      });
      const saved = await queryRunner.manager.save(referral);

      await queryRunner.manager.increment(
        ReferralCode,
        { id: referralCode.id },
        "usageCount",
        1,
      );

      await queryRunner.commitTransaction();

      this.logger.log(
        `Referral applied: ${referredUserId} referred by ${referralCode.userId} via code ${code}`,
      );

      return {
        message: "Referral code applied successfully.",
        referralId: saved.id,
        referrerId: referralCode.userId,
      };
    } catch (err: any) {
      await queryRunner.rollbackTransaction();

      if (this.isUniqueViolation(err)) {
        throw new ConflictException(
          "You have already been referred by another user.",
        );
      }

      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ─── Claim Reward (triggered on first tip by referred user) ───────────────

  async claimReward(
    referredUserId: string,
    triggerTipId?: string,
  ): Promise<boolean> {
    const referral = await this.referralRepo.findOne({
      where: { referredUserId, rewardClaimed: false },
      relations: ["referralCode"],
    });

    if (!referral) {
      return false;
    }

    const updateResult = await this.referralRepo.update(
      { id: referral.id, rewardClaimed: false },
      {
        rewardClaimed: true,
        rewardClaimedAt: new Date(),
      },
    );

    if (!updateResult.affected) {
      this.logger.debug(
        `Reward already claimed for referred user ${referredUserId}; skipping duplicate trigger${triggerTipId ? ` for tip ${triggerTipId}` : ""}`,
      );
      return false;
    }

    this.logger.log(
      `Reward claimed for referrer ${referral.referrerId}: ${referral.referralCode.rewardType} = ${referral.referralCode.rewardValue}${triggerTipId ? ` via tip ${triggerTipId}` : ""}`,
    );

    // TODO: integrate with reward dispatcher (XLM payment, badge grant, etc.)
    // await this.rewardDispatcher.dispatch(referral.referrerId, referral.referralCode);

    return true;
  }

  @OnEvent("tip.verified", { async: true })
  async handleTipVerified(event: TipVerifiedEvent): Promise<void> {
    if (!event.senderUserId || event.amount <= 0) {
      return;
    }

    await this.claimReward(event.senderUserId, event.tipId);
  }

  // ─── Stats ────────────────────────────────────────────────────────────────

  async getStats(userId: string): Promise<ReferralStatsDto> {
    const [totalReferrals, claimedRewards] = await Promise.all([
      this.referralRepo.count({ where: { referrerId: userId } }),
      this.referralRepo.count({
        where: { referrerId: userId, rewardClaimed: true },
      }),
    ]);

    const totalRewardResult = await this.referralRepo
      .createQueryBuilder("r")
      .innerJoin("r.referralCode", "rc")
      .where("r.referrerId = :userId", { userId })
      .andWhere("r.rewardClaimed = true")
      .select("SUM(rc.rewardValue)", "total")
      .getRawOne<{ total: string }>();

    const code = await this.referralCodeRepo.findOne({
      where: { userId, isActive: true },
      order: { createdAt: "DESC" },
    });

    return {
      totalReferrals,
      claimedRewards,
      pendingRewards: totalReferrals - claimedRewards,
      totalRewardValue: parseFloat(totalRewardResult?.total ?? "0"),
      codeUsageCount: code?.usageCount ?? 0,
    };
  }

  // ─── Leaderboard ──────────────────────────────────────────────────────────

  async getLeaderboard(limit = 10): Promise<LeaderboardEntryDto[]> {
    const rows = await this.referralRepo
      .createQueryBuilder("r")
      .select("r.referrerId", "userId")
      .addSelect("COUNT(r.id)", "totalReferrals")
      .addSelect(
        "SUM(CASE WHEN r.rewardClaimed = true THEN 1 ELSE 0 END)",
        "claimedRewards",
      )
      .groupBy("r.referrerId")
      .orderBy('"totalReferrals"', "DESC")
      .limit(limit)
      .getRawMany<{
        userId: string;
        totalReferrals: string;
        claimedRewards: string;
      }>();

    return rows.map((row, index) => ({
      rank: index + 1,
      userId: row.userId,
      totalReferrals: parseInt(row.totalReferrals, 10),
      claimedRewards: parseInt(row.claimedRewards, 10),
    }));
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private toCodeResponse(code: ReferralCode): ReferralCodeResponseDto {
    const baseUrl = this.configService.get<string>(
      "APP_BASE_URL",
      "https://tiptune.app",
    );
    return {
      id: code.id,
      code: code.code,
      userId: code.userId,
      rewardType: code.rewardType,
      rewardValue: Number(code.rewardValue),
      usageCount: code.usageCount,
      maxUsages: code.maxUsages ?? undefined,
      isActive: code.isActive,
      expiresAt: code.expiresAt ?? undefined,
      shareableLink: `${baseUrl}/register?ref=${code.code}`,
      createdAt: code.createdAt,
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "23505"
    );
  }
}
