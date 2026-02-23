import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageModerationLog, ModerationResult, ReviewAction } from './entities/message-moderation-log.entity';
import { BlockedKeyword, KeywordSeverity } from './entities/blocked-keyword.entity';
import { Tip } from '../tips/entities/tip.entity';
import { User } from '../users/entities/user.entity';
import { Artist } from '../artists/entities/artist.entity';
import { MessageFilterService, MessageFilterResult } from './message-filter.service';

@Injectable()
export class ModerationService {
  constructor(
    @InjectRepository(MessageModerationLog)
    private readonly moderationLogRepository: Repository<MessageModerationLog>,
    @InjectRepository(BlockedKeyword)
    private readonly blockedKeywordRepository: Repository<BlockedKeyword>,
    @InjectRepository(Artist)
    private readonly artistRepository: Repository<Artist>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly messageFilterService: MessageFilterService,
  ) {}

  async getKeywordsForArtist(artistId: string | null): Promise<BlockedKeyword[]> {
    if (!artistId) {
      return this.blockedKeywordRepository.find();
    }

    const [global, artistKeywords] = await Promise.all([
      this.blockedKeywordRepository.find({ where: { artistId: null } }),
      this.blockedKeywordRepository.find({ where: { artistId } }),
    ]);

    return [...global, ...artistKeywords];
  }

  async moderateTipMessage(tip: Tip, artistUserId: string | null): Promise<MessageModerationLog | null> {
    if (!tip.message) {
      return null;
    }

    const artist = artistUserId
      ? await this.artistRepository.findOne({ where: { userId: artistUserId } })
      : null;

    const keywords = await this.getKeywordsForArtist(artist ? artist.id : null);

    const filterResult = this.messageFilterService.applyFilters(
      tip.message,
      keywords,
    );

    const moderationResult = this.mapFilterResult(filterResult.result);

    const log = this.moderationLogRepository.create({
      tipId: tip.id,
      originalMessage: tip.message,
      moderationResult,
      filterReason: filterResult.reason,
      confidenceScore: filterResult.confidence.toFixed(2),
      wasManuallyReviewed: false,
      reviewedById: null,
      reviewAction: null,
    });

    const saved = await this.moderationLogRepository.save(log);

    if (moderationResult === ModerationResult.BLOCKED) {
      tip.message = null;
    } else if (moderationResult === ModerationResult.FILTERED) {
      tip.message = filterResult.sanitizedMessage;
    } else if (moderationResult === ModerationResult.FLAGGED) {
      tip.message = null;
    }

    return saved;
  }

  async previewMessage(
    message: string,
  ): Promise<MessageFilterResult> {
    const keywords = await this.getKeywordsForArtist(null);
    return this.messageFilterService.applyFilters(message, keywords);
  }

  mapFilterResult(result: MessageFilterResult['result']): ModerationResult {
    if (result === 'approved') {
      return ModerationResult.APPROVED;
    }
    if (result === 'filtered') {
      return ModerationResult.FILTERED;
    }
    if (result === 'flagged') {
      return ModerationResult.FLAGGED;
    }
    return ModerationResult.BLOCKED;
  }

  async addGlobalKeyword(keyword: string, severity: KeywordSeverity, admin: User): Promise<BlockedKeyword> {
    const entity = this.blockedKeywordRepository.create({
      keyword,
      severity,
      addedById: admin.id,
      artistId: null,
    });
    return this.blockedKeywordRepository.save(entity);
  }

  async deleteKeyword(id: string): Promise<void> {
    await this.blockedKeywordRepository.delete(id);
  }

  async addArtistKeyword(keyword: string, severity: KeywordSeverity, artistUser: User): Promise<BlockedKeyword> {
    if (!artistUser.isArtist) {
      throw new Error('Only artists can add artist keywords');
    }

    const artist = await this.artistRepository.findOne({
      where: { userId: artistUser.id },
    });

    if (!artist) {
      throw new Error('Artist profile not found');
    }

    const entity = this.blockedKeywordRepository.create({
      keyword,
      severity,
      addedById: artistUser.id,
      artistId: artist.id,
    });

    return this.blockedKeywordRepository.save(entity);
  }

  async getModerationQueue(page: number, limit: number) {
    const qb = this.moderationLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.tip', 'tip')
      .leftJoinAndSelect('tip.artist', 'artist')
      .leftJoinAndSelect('artist.user', 'artistUser')
      .where('log.moderationResult = :result', {
        result: ModerationResult.FLAGGED,
      })
      .andWhere('log.wasManuallyReviewed = :reviewed', {
        reviewed: false,
      })
      .orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async reviewModerationLog(
    logId: string,
    action: ReviewAction,
    admin: User,
  ): Promise<MessageModerationLog> {
    const log = await this.moderationLogRepository.findOne({
      where: { id: logId },
      relations: ['tip'],
    });

    if (!log) {
      throw new Error('Moderation log not found');
    }

    log.wasManuallyReviewed = true;
    log.reviewAction = action;
    log.reviewedById = admin.id;

    if (action === ReviewAction.APPROVE) {
      log.moderationResult = ModerationResult.APPROVED;
      if (log.tip) {
        log.tip.message = log.originalMessage;
      }
    }

    if (action === ReviewAction.BLOCK) {
      log.moderationResult = ModerationResult.BLOCKED;
      if (log.tip) {
        log.tip.message = null;
      }
    }

    await this.moderationLogRepository.save(log);

    if (log.tip) {
      await this.moderationLogRepository.manager.getRepository(Tip).save(log.tip);
    }

    return log;
  }

  async getStats() {
    const qb = this.moderationLogRepository.createQueryBuilder('log');

    const result = await qb
      .select([
        'COUNT(log.id) as total',
        'SUM(CASE WHEN log.moderationResult = :approved THEN 1 ELSE 0 END) as approved',
        'SUM(CASE WHEN log.moderationResult = :filtered THEN 1 ELSE 0 END) as filtered',
        'SUM(CASE WHEN log.moderationResult = :flagged THEN 1 ELSE 0 END) as flagged',
        'SUM(CASE WHEN log.moderationResult = :blocked THEN 1 ELSE 0 END) as blocked',
      ])
      .setParameters({
        approved: ModerationResult.APPROVED,
        filtered: ModerationResult.FILTERED,
        flagged: ModerationResult.FLAGGED,
        blocked: ModerationResult.BLOCKED,
      })
      .getRawOne();

    return {
      total: parseInt(result.total || 0, 10),
      approved: parseInt(result.approved || 0, 10),
      filtered: parseInt(result.filtered || 0, 10),
      flagged: parseInt(result.flagged || 0, 10),
      blocked: parseInt(result.blocked || 0, 10),
    };
  }
}
