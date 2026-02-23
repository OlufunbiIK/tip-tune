import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  BlockedKeyword,
  KeywordSeverity,
} from "./entities/blocked-keyword.entity";
import {
  MessageModerationLog,
  ModerationResult,
} from "./entities/moderation-log.entity";
import { Tip } from "../tips/entities/tip.entity";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationType } from "@/notifications/notification.entity";

@Injectable()
export class ModerationService {
  constructor(
    @InjectRepository(BlockedKeyword)
    private readonly keywordRepo: Repository<BlockedKeyword>,
    @InjectRepository(MessageModerationLog)
    private readonly logRepo: Repository<MessageModerationLog>,
    @InjectRepository(Tip)
    private readonly tipRepo: Repository<Tip>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async addKeyword(
    keyword: string,
    severity: string,
    addedById: string,
    artistId?: string,
  ) {
    if (!Object.values(KeywordSeverity).includes(severity as KeywordSeverity)) {
      throw new BadRequestException(
        `Invalid severity: ${severity}. Must be one of: ${Object.values(KeywordSeverity).join(", ")}`,
      );
    }
    const newKeyword = this.keywordRepo.create({
      keyword: keyword.toLowerCase().trim(),
      severity: severity as KeywordSeverity,
      addedById,
      artistId,
    });
    return this.keywordRepo.save(newKeyword);
  }

  async getPendingQueue() {
    return this.logRepo.find({
      where: {
        moderationResult: ModerationResult.FLAGGED,
        wasManuallyReviewed: false,
      },
      relations: ["tip", "tip.artist"],
      order: { createdAt: "DESC" },
    });
  }

  async resolveFlaggedMessage(
    logId: string,
    action: "approve" | "block",
    adminId: string,
  ) {
    const log = await this.logRepo.findOne({
      where: { id: logId },
      relations: ["tip"],
    });
    if (!log) throw new NotFoundException("Moderation log entry not found");
    if (log.wasManuallyReviewed) {
      throw new ConflictException("This log entry has already been reviewed");
    }

    log.wasManuallyReviewed = true;
    log.reviewedById = adminId;

    if (action === "approve") {
      log.moderationResult = ModerationResult.APPROVED;
      // Now that it's approved, release the notification to the artist
      await this.notificationsService.create({
        userId: log.tip.artistId,
        type: NotificationType.TIP_RECEIVED,
        title: "New Tip Received (Moderated)",
        message: log.originalMessage,
        data: { tipId: log.tipId },
      });
    } else {
      log.moderationResult = ModerationResult.BLOCKED;
      // Update the tip record to hide the message permanently
      await this.tipRepo.update(log.tipId, {
        message: "[Message blocked by moderator]",
      });
    }

    return this.logRepo.save(log);
  }

  async getModerationStats() {
    const stats = await this.logRepo
      .createQueryBuilder("log")
      .select("log.moderationResult", "status")
      .addSelect("COUNT(*)", "count")
      .groupBy("log.moderationResult")
      .getRawMany();

    return stats;
  }
}
