import { Injectable, Logger, Inject } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between, MoreThan } from "typeorm";
import Redis from "ioredis";
import { Artist } from "../artists/entities/artist.entity";
import { Track } from "../tracks/entities/track.entity";
import { Tip, TipStatus } from "../tips/entities/tip.entity";
import { RankingService, Timeframe } from "./ranking.service";
import { LeaderboardQueryDto } from "./dto/leaderboard-query.dto";
import {
  LeaderboardEntryDto,
  LeaderboardResponseDto,
} from "./dto/leaderboard-response.dto";
import { REDIS_CLIENT } from "./redis.module";

export enum LeaderboardType {
  ARTIST_MOST_TIPPED = "artist-most-tipped",
  ARTIST_MOST_PLAYED = "artist-most-played",
  ARTIST_FASTEST_GROWING = "artist-fastest-growing",
  ARTIST_BY_GENRE = "artist-by-genre",
  TIPPER_MOST_GENEROUS = "tipper-most-generous",
  TIPPER_MOST_ACTIVE = "tipper-most-active",
  TIPPER_BIGGEST_SINGLE = "tipper-biggest-single",
  TRACK_TRENDING = "track-trending",
  TRACK_MOST_TIPPED = "track-most-tipped",
  TRACK_MOST_PLAYED = "track-most-played",
}

@Injectable()
export class LeaderboardsService {
  private readonly logger = new Logger(LeaderboardsService.name);
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    @InjectRepository(Artist)
    private readonly artistRepository: Repository<Artist>,
    @InjectRepository(Track)
    private readonly trackRepository: Repository<Track>,
    @InjectRepository(Tip)
    private readonly tipRepository: Repository<Tip>,
    private readonly rankingService: RankingService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  /**
   * Get leaderboard by type
   */
  async getLeaderboard(
    type: LeaderboardType,
    query: LeaderboardQueryDto,
  ): Promise<LeaderboardResponseDto> {
    const cacheKey = this.getCacheKey(type, query);

    // Try to get from cache
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    let entries: LeaderboardEntryDto[];

    switch (type) {
      case LeaderboardType.ARTIST_MOST_TIPPED:
        entries = await this.getArtistMostTipped(query);
        break;
      case LeaderboardType.ARTIST_MOST_PLAYED:
        entries = await this.getArtistMostPlayed(query);
        break;
      case LeaderboardType.ARTIST_FASTEST_GROWING:
        entries = await this.getArtistFastestGrowing(query);
        break;
      case LeaderboardType.ARTIST_BY_GENRE:
        entries = await this.getArtistByGenre(query);
        break;
      case LeaderboardType.TIPPER_MOST_GENEROUS:
        entries = await this.getTipperMostGenerous(query);
        break;
      case LeaderboardType.TIPPER_MOST_ACTIVE:
        entries = await this.getTipperMostActive(query);
        break;
      case LeaderboardType.TIPPER_BIGGEST_SINGLE:
        entries = await this.getTipperBiggestSingle(query);
        break;
      case LeaderboardType.TRACK_TRENDING:
        entries = await this.getTrackTrending(query);
        break;
      case LeaderboardType.TRACK_MOST_TIPPED:
        entries = await this.getTrackMostTipped(query);
        break;
      case LeaderboardType.TRACK_MOST_PLAYED:
        entries = await this.getTrackMostPlayed(query);
        break;
      default:
        throw new Error(`Unknown leaderboard type: ${type}`);
    }

    const response: LeaderboardResponseDto = {
      entries,
      total: entries.length,
      timeframe: query.timeframe || Timeframe.ALL_TIME,
      updatedAt: new Date(),
    };

    // Cache the result
    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(response));

    return response;
  }

  /**
   * Artist Leaderboards
   */
  private async getArtistMostTipped(
    query: LeaderboardQueryDto,
  ): Promise<LeaderboardEntryDto[]> {
    const { start, end } = this.rankingService.getDateRange(
      query.timeframe || Timeframe.ALL_TIME,
    );

    const queryBuilder = this.artistRepository
      .createQueryBuilder("artist")
      .leftJoin("artist.tips", "tip", "tip.status = :status", {
        status: TipStatus.VERIFIED,
      });

    if (query.timeframe !== Timeframe.ALL_TIME) {
      queryBuilder.andWhere("tip.createdAt BETWEEN :start AND :end", {
        start,
        end,
      });
    }

    if (query.genre) {
      queryBuilder.andWhere("artist.genre = :genre", { genre: query.genre });
    }

    const results = await queryBuilder
      .select([
        "artist.id",
        "artist.artistName",
        "artist.profileImage",
        "artist.genre",
      ])
      .addSelect("COALESCE(SUM(tip.amount), 0)", "totalAmount")
      .addSelect("COUNT(tip.id)", "tipCount")
      .groupBy("artist.id")
      .addGroupBy("artist.artistName")
      .addGroupBy("artist.profileImage")
      .addGroupBy("artist.genre")
      .orderBy("totalAmount", "DESC")
      .limit(query.limit || 50)
      .offset(query.offset || 0)
      .getRawMany();

    return results.map((result, index) => ({
      id: result.artist_id,
      rank: (query.offset || 0) + index + 1,
      score: parseFloat(result.totalAmount || 0),
      name: result.artist_artistName,
      avatarUrl: result.artist_profileImage,
      additionalData: {
        tipCount: parseInt(result.tipCount || 0),
        genre: result.artist_genre,
      },
    }));
  }

  private async getArtistMostPlayed(
    query: LeaderboardQueryDto,
  ): Promise<LeaderboardEntryDto[]> {
    const queryBuilder = this.artistRepository
      .createQueryBuilder("artist")
      .leftJoin("artist.tracks", "track")
      .select([
        "artist.id",
        "artist.artistName",
        "artist.profileImage",
        "artist.genre",
      ])
      .addSelect("SUM(track.plays)", "totalPlays")
      .addSelect("COUNT(track.id)", "trackCount")
      .groupBy("artist.id")
      .orderBy("totalPlays", "DESC")
      .limit(query.limit || 50)
      .offset(query.offset || 0);

    if (query.genre) {
      queryBuilder.andWhere("artist.genre = :genre", { genre: query.genre });
    }

    const results = await queryBuilder.getRawMany();

    return results.map((result, index) => ({
      id: result.artist_id,
      rank: (query.offset || 0) + index + 1,
      score: parseInt(result.totalPlays || 0),
      name: result.artist_artistName,
      avatarUrl: result.artist_profileImage,
      additionalData: {
        trackCount: parseInt(result.trackCount || 0),
        genre: result.artist_genre,
      },
    }));
  }

  private async getArtistFastestGrowing(
    query: LeaderboardQueryDto,
  ): Promise<LeaderboardEntryDto[]> {
    const now = new Date();
    const recentStart = new Date(now);
    recentStart.setDate(recentStart.getDate() - 7); // Last 7 days
    const historicalStart = new Date(now);
    historicalStart.setDate(historicalStart.getDate() - 30); // Last 30 days

    // Get recent tips (last 7 days)
    const recentTips = await this.tipRepository
      .createQueryBuilder("tip")
      .select("tip.toArtistId", "toArtistId")
      .addSelect("SUM(tip.amount)", "recentAmount")
      .where("tip.status = :status", { status: TipStatus.VERIFIED })
      .andWhere("tip.createdAt >= :recentStart", { recentStart })
      .groupBy("tip.toArtistId")
      .getRawMany();

    // Get historical tips (last 30 days)
    const historicalTips = await this.tipRepository
      .createQueryBuilder("tip")
      .select("tip.toArtistId", "toArtistId")
      .addSelect("SUM(tip.amount)", "historicalAmount")
      .where("tip.status = :status", { status: TipStatus.VERIFIED })
      .andWhere("tip.createdAt >= :historicalStart", { historicalStart })
      .andWhere("tip.createdAt < :recentStart", { recentStart })
      .groupBy("tip.toArtistId")
      .getRawMany();

    const recentMap = new Map(
      recentTips.map((t) => [t.toArtistId, parseFloat(t.recentAmount || 0)]),
    );
    const historicalMap = new Map(
      historicalTips.map((t) => [
        t.toArtistId,
        parseFloat(t.historicalAmount || 0),
      ]),
    );

    // Get all artists
    const artists = await this.artistRepository.find({
      where: query.genre ? { genre: query.genre } : {},
    });

    const scores = artists.map((artist) => {
      // toArtistId in Tip is a User ID, so we need to use artist.userId
      const recent = recentMap.get(artist.userId) || 0;
      const historical = historicalMap.get(artist.userId) || 0;
      const growthScore = this.rankingService.calculateGrowthScore(
        recent,
        historical,
        7,
      );
      return {
        artist,
        score: growthScore,
      };
    });

    scores.sort((a, b) => b.score - a.score);

    return scores
      .slice(query.offset || 0, (query.offset || 0) + (query.limit || 50))
      .map((item, index) => ({
        id: item.artist.id,
        rank: (query.offset || 0) + index + 1,
        score: item.score,
        name: item.artist.artistName,
        avatarUrl: item.artist.profileImage,
        additionalData: {
          genre: item.artist.genre,
        },
      }));
  }

  private async getArtistByGenre(
    query: LeaderboardQueryDto,
  ): Promise<LeaderboardEntryDto[]> {
    if (!query.genre) {
      throw new Error("Genre is required for artist-by-genre leaderboard");
    }

    return this.getArtistMostTipped({ ...query, genre: query.genre });
  }

  /**
   * Tipper Leaderboards
   */
  private async getTipperMostGenerous(
    query: LeaderboardQueryDto,
  ): Promise<LeaderboardEntryDto[]> {
    const { start, end } = this.rankingService.getDateRange(
      query.timeframe || Timeframe.ALL_TIME,
    );

    const queryBuilder = this.tipRepository
      .createQueryBuilder("tip")
      .where("tip.status = :status", { status: TipStatus.VERIFIED });

    if (query.timeframe !== Timeframe.ALL_TIME) {
      queryBuilder.andWhere("tip.createdAt BETWEEN :start AND :end", {
        start,
        end,
      });
    }

    const results = await queryBuilder
      .select("tip.fromUserId", "fromUserId")
      .addSelect("COALESCE(SUM(tip.amount), 0)", "totalAmount")
      .addSelect("COUNT(tip.id)", "tipCount")
      .groupBy("tip.fromUserId")
      .orderBy("totalAmount", "DESC")
      .limit(query.limit || 50)
      .offset(query.offset || 0)
      .getRawMany();

    return results.map((result, index) => ({
      id: result.fromUserId,
      rank: (query.offset || 0) + index + 1,
      score: parseFloat(result.totalAmount || 0),
      name: `User ${result.fromUserId.slice(0, 8)}`,
      additionalData: {
        tipCount: parseInt(result.tipCount || 0),
        userId: result.fromUserId,
      },
    }));
  }

  private async getTipperMostActive(
    query: LeaderboardQueryDto,
  ): Promise<LeaderboardEntryDto[]> {
    const { start, end } = this.rankingService.getDateRange(
      query.timeframe || Timeframe.ALL_TIME,
    );

    const queryBuilder = this.tipRepository
      .createQueryBuilder("tip")
      .where("tip.status = :status", { status: TipStatus.VERIFIED });

    if (query.timeframe !== Timeframe.ALL_TIME) {
      queryBuilder.andWhere("tip.createdAt BETWEEN :start AND :end", {
        start,
        end,
      });
    }

    const results = await queryBuilder
      .select("tip.fromUserId", "fromUserId")
      .addSelect("COUNT(tip.id)", "tipCount")
      .addSelect("COALESCE(SUM(tip.amount), 0)", "totalAmount")
      .groupBy("tip.fromUserId")
      .orderBy("tipCount", "DESC")
      .limit(query.limit || 50)
      .offset(query.offset || 0)
      .getRawMany();

    return results.map((result, index) => ({
      id: result.fromUserId,
      rank: (query.offset || 0) + index + 1,
      score: parseInt(result.tipCount || 0),
      name: `User ${result.fromUserId.slice(0, 8)}`,
      additionalData: {
        totalAmount: parseFloat(result.totalAmount || 0),
        userId: result.fromUserId,
      },
    }));
  }

  private async getTipperBiggestSingle(
    query: LeaderboardQueryDto,
  ): Promise<LeaderboardEntryDto[]> {
    const { start, end } = this.rankingService.getDateRange(
      query.timeframe || Timeframe.ALL_TIME,
    );

    const queryBuilder = this.tipRepository
      .createQueryBuilder("tip")
      .where("tip.status = :status", { status: TipStatus.VERIFIED });

    if (query.timeframe !== Timeframe.ALL_TIME) {
      queryBuilder.andWhere("tip.createdAt BETWEEN :start AND :end", {
        start,
        end,
      });
    }

    // Get max tip per sender using subquery
    const subQuery = this.tipRepository
      .createQueryBuilder("tip2")
      .select("tip2.senderAddress", "senderAddress")
      .addSelect("MAX(tip2.amount)", "maxAmount")
      .where("tip2.status = :status", { status: TipStatus.VERIFIED })
      .groupBy("tip2.senderAddress");

    if (query.timeframe !== Timeframe.ALL_TIME) {
      subQuery.andWhere("tip2.createdAt BETWEEN :start AND :end", {
        start,
        end,
      });
    }

    const maxTips = await subQuery.getRawMany();

    // Get the actual tip records for the max amounts
    const results = await Promise.all(
      maxTips.map(async (maxTip) => {
        const tipQuery = this.tipRepository
          .createQueryBuilder("tip")
          .where("tip.fromUserId = :userId", { userId: maxTip.fromUserId })
          .andWhere("tip.amount = :amount", { amount: maxTip.maxAmount })
          .andWhere("tip.status = :status", { status: TipStatus.VERIFIED })
          .orderBy("tip.createdAt", "DESC")
          .limit(1);

        if (query.timeframe !== Timeframe.ALL_TIME) {
          tipQuery.andWhere("tip.createdAt BETWEEN :start AND :end", {
            start,
            end,
          });
        }

        const tip = await tipQuery.getOne();
        return {
          fromUserId: maxTip.fromUserId,
          maxAmount: parseFloat(maxTip.maxAmount || 0),
          tipId: tip?.id,
          tipCreatedAt: tip?.createdAt,
        };
      }),
    );

    results.sort((a, b) => b.maxAmount - a.maxAmount);

    return results
      .slice(query.offset || 0, (query.offset || 0) + (query.limit || 50))
      .map((result, index) => ({
        id: result.fromUserId,
        rank: (query.offset || 0) + index + 1,
        score: result.maxAmount,
        name: `User ${result.fromUserId.slice(0, 8)}`,
        additionalData: {
          tipId: result.tipId,
          tipDate: result.tipCreatedAt,
          userId: result.fromUserId,
        },
      }));
  }

  /**
   * Track Leaderboards
   */
  private async getTrackTrending(
    query: LeaderboardQueryDto,
  ): Promise<LeaderboardEntryDto[]> {
    const tracks = await this.trackRepository.find({
      relations: ["artist", "tips"],
      where: { isPublic: true },
    });

    const now = new Date();
    const scores = tracks.map((track) => {
      const ageInDays = this.rankingService.getAgeInDays(track.createdAt);
      const verifiedTips =
        track.tips?.filter((t) => t.status === TipStatus.VERIFIED) || [];
      const totalTipAmount = verifiedTips.reduce(
        (sum, tip) => sum + parseFloat(tip.amount.toString()),
        0,
      );

      const score = this.rankingService.calculateTrendingScore(
        track.plays,
        verifiedTips.length,
        totalTipAmount,
        ageInDays,
      );

      return {
        track,
        score,
      };
    });

    scores.sort((a, b) => b.score - a.score);

    return scores
      .slice(query.offset || 0, (query.offset || 0) + (query.limit || 50))
      .map((item, index) => ({
        id: item.track.id,
        rank: (query.offset || 0) + index + 1,
        score: item.score,
        name: item.track.title,
        avatarUrl: item.track.coverArtUrl,
        additionalData: {
          artistName: item.track.artist?.artistName,
          plays: item.track.plays,
          tipCount: item.track.tipCount,
          genre: item.track.genre,
        },
      }));
  }

  private async getTrackMostTipped(
    query: LeaderboardQueryDto,
  ): Promise<LeaderboardEntryDto[]> {
    const { start, end } = this.rankingService.getDateRange(
      query.timeframe || Timeframe.ALL_TIME,
    );

    const queryBuilder = this.trackRepository
      .createQueryBuilder("track")
      .leftJoin("track.tips", "tip", "tip.status = :status", {
        status: TipStatus.VERIFIED,
      })
      .leftJoin("track.artist", "artist")
      .where("track.isPublic = :isPublic", { isPublic: true });

    if (query.timeframe !== Timeframe.ALL_TIME) {
      queryBuilder.andWhere("tip.createdAt BETWEEN :start AND :end", {
        start,
        end,
      });
    }

    const results = await queryBuilder
      .select([
        "track.id",
        "track.title",
        "track.coverArtUrl",
        "track.genre",
        "artist.artistName",
      ])
      .addSelect("COALESCE(SUM(tip.amount), 0)", "totalAmount")
      .addSelect("COUNT(tip.id)", "tipCount")
      .groupBy("track.id")
      .addGroupBy("track.title")
      .addGroupBy("track.coverArtUrl")
      .addGroupBy("track.genre")
      .addGroupBy("artist.id")
      .addGroupBy("artist.artistName")
      .orderBy("totalAmount", "DESC")
      .limit(query.limit || 50)
      .offset(query.offset || 0)
      .getRawMany();

    return results.map((result, index) => ({
      id: result.track_id,
      rank: (query.offset || 0) + index + 1,
      score: parseFloat(result.totalAmount || 0),
      name: result.track_title,
      avatarUrl: result.track_coverArtUrl,
      additionalData: {
        tipCount: parseInt(result.tipCount || 0),
        artistName: result.artist_artistName,
        genre: result.track_genre,
      },
    }));
  }

  private async getTrackMostPlayed(
    query: LeaderboardQueryDto,
  ): Promise<LeaderboardEntryDto[]> {
    const queryBuilder = this.trackRepository
      .createQueryBuilder("track")
      .leftJoin("track.artist", "artist")
      .where("track.isPublic = :isPublic", { isPublic: true })
      .select([
        "track.id",
        "track.title",
        "track.coverArtUrl",
        "track.genre",
        "track.plays",
        "artist.artistName",
      ])
      .orderBy("track.plays", "DESC")
      .limit(query.limit || 50)
      .offset(query.offset || 0);

    const results = await queryBuilder.getRawMany();

    return results.map((result, index) => ({
      id: result.id,
      rank: (query.offset || 0) + index + 1,
      score: result.plays,
      name: result.title,
      avatarUrl: result.coverArtUrl,
      additionalData: {
        artistName: result.artist?.artistName,
        genre: result.genre,
      },
    }));
  }

  /**
   * Invalidate cache for a specific leaderboard type
   */
  async invalidateCache(
    type: LeaderboardType,
    query?: LeaderboardQueryDto,
  ): Promise<void> {
    if (query) {
      const cacheKey = this.getCacheKey(type, query);
      await this.redis.del(cacheKey);
    } else {
      // Invalidate all caches for this type
      const pattern = `leaderboard:${type}:*`;
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    }
  }

  /**
   * Generate cache key
   */
  private getCacheKey(
    type: LeaderboardType,
    query: LeaderboardQueryDto,
  ): string {
    const parts = [
      "leaderboard",
      type,
      query.timeframe || Timeframe.ALL_TIME,
      query.limit || 50,
      query.offset || 0,
    ];
    if (query.genre) {
      parts.push(query.genre);
    }
    return parts.join(":");
  }
}
