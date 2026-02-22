import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { Badge, BadgeCategory, BadgeTier } from './entities/badge.entity';
import { UserBadge } from './entities/user-badge.entity';
import { Tip, TipStatus } from '../tips/entities/tip.entity';
import { Track } from '../tracks/entities/track.entity';
import { Artist } from '../artists/entities/artist.entity';
import { User } from '../users/entities/user.entity';
import { Follow, FollowingType } from '../follows/entities/follow.entity';
import { TipVerifiedEvent } from '../tips/events/tip-verified.event';
import { TrackUploadedEvent } from '../tracks/events/track-uploaded.event';
import { TrackPlayedEvent } from '../tracks/events/track-played.event';
import { UserFollowedEvent } from '../follows/events/user-followed.event';
import { StellarService } from '../stellar/stellar.service';
import { NotificationsService } from '../notifications/notifications.service'; // Assuming service exists
// import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class GamificationService implements OnModuleInit {
    private readonly logger = new Logger(GamificationService.name);

    constructor(
        @InjectRepository(Badge)
        private readonly badgeRepo: Repository<Badge>,
        @InjectRepository(UserBadge)
        private readonly userBadgeRepo: Repository<UserBadge>,
        @InjectRepository(Tip)
        private readonly tipRepo: Repository<Tip>,
        @InjectRepository(Track)
        private readonly trackRepo: Repository<Track>,
        @InjectRepository(Artist)
        private readonly artistRepo: Repository<Artist>,
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        @InjectRepository(Follow)
        private readonly followRepo: Repository<Follow>,
        private readonly stellarService: StellarService,
        private readonly notificationsService: NotificationsService,
    ) { }

    async onModuleInit() {
        await this.seedBadges();
    }

    private async seedBadges() {
        const badges = [
            // Tipper Badges
            { name: 'First Tip', category: BadgeCategory.TIPPER, tier: BadgeTier.BRONZE, description: 'Sent your first tip!', criteria: { tipsSent: 1 } },
            { name: '10 Tips', category: BadgeCategory.TIPPER, tier: BadgeTier.SILVER, description: 'Sent 10 tips.', criteria: { tipsSent: 10 } },
            { name: '100 Tips', category: BadgeCategory.TIPPER, tier: BadgeTier.GOLD, description: 'Sent 100 tips.', criteria: { tipsSent: 100 } },
            { name: 'Early Supporter', category: BadgeCategory.TIPPER, tier: BadgeTier.SILVER, description: 'One of the first 10 tippers of an artist.', criteria: { type: 'early_adopter' } },
            { name: 'Genre Explorer', category: BadgeCategory.TIPPER, tier: BadgeTier.GOLD, description: 'Tipped in 5+ genres.', criteria: { genres: 5 } },

            // Artist Badges
            { name: 'First Track Upload', category: BadgeCategory.ARTIST, tier: BadgeTier.BRONZE, description: 'Uploaded your first track.', criteria: { tracksUploaded: 1 } },
            { name: '100 Plays', category: BadgeCategory.ARTIST, tier: BadgeTier.BRONZE, description: 'Reached 100 total plays.', criteria: { totalPlays: 100 } },
            { name: '1,000 Plays', category: BadgeCategory.ARTIST, tier: BadgeTier.SILVER, description: 'Reached 1,000 total plays.', criteria: { totalPlays: 1000 } },
            { name: 'First Tip Received', category: BadgeCategory.ARTIST, tier: BadgeTier.BRONZE, description: 'Received your first tip.', criteria: { tipsReceived: 1 } },
            { name: '100 Tips Received', category: BadgeCategory.ARTIST, tier: BadgeTier.SILVER, description: 'Received 100 tips.', criteria: { tipsReceived: 100 } },
            { name: 'Rising Star', category: BadgeCategory.ARTIST, tier: BadgeTier.GOLD, description: 'Reached 100 followers.', criteria: { followers: 100 } },
        ];

        for (const b of badges) {
            const exists = await this.badgeRepo.findOne({ where: { name: b.name } });
            if (!exists) {
                await this.badgeRepo.save(this.badgeRepo.create(b));
                this.logger.log(`Seeded badge: ${b.name}`);
            }
        }
    }

    @OnEvent('tip.verified', { async: true })
    async handleTipVerified(payload: TipVerifiedEvent) {
        this.logger.log(`Processing tip verified event for tip ${payload.tipId}`);
        const { senderId, artistId } = payload;

        // 1. Tipper Badges 
        // Resolve User by wallet address if senderId might be address? 
        // Assuming senderId is the User UUID here as established.
        const user = await this.userRepo.findOne({ where: { id: senderId } });
        if (user) {
            // Count tips from this user's wallet
            const tipsSentCount = await this.tipRepo.count({
                where: {
                    senderAddress: user.walletAddress,
                    status: TipStatus.VERIFIED // Using VERIFIED
                }
            });

            if (tipsSentCount >= 1) await this.awardBadge(user.id, 'First Tip');
            if (tipsSentCount >= 10) await this.awardBadge(user.id, '10 Tips');
            if (tipsSentCount >= 100) await this.awardBadge(user.id, '100 Tips');

            // Genre Explorer logic
            const genreStats = await this.tipRepo.createQueryBuilder('tip')
                .leftJoin('tip.artist', 'artist')
                .select('COUNT(DISTINCT artist.genre)', 'count')
                .where('tip.senderAddress = :wallet', { wallet: user.walletAddress })
                .andWhere('tip.status = :status', { status: TipStatus.VERIFIED })
                .getRawOne();

            const distinctGenres = parseInt(genreStats.count || '0', 10);
            if (distinctGenres >= 5) await this.awardBadge(user.id, 'Genre Explorer');

            // Early Supporter logic
            // Find tips for this artist
            // Tip.artistId links to Artist entity. artistId from payload is Artist ID.
            const artistTips = await this.tipRepo.find({
                where: { artistId: artistId, status: TipStatus.VERIFIED },
                order: { createdAt: 'ASC' },
                take: 100
            });

            const uniqueTippers = new Set<string>();
            let rank = 0;
            let isEarly = false;

            for (const t of artistTips) {
                if (!uniqueTippers.has(t.senderAddress)) {
                    uniqueTippers.add(t.senderAddress);
                    rank++;
                    if (t.senderAddress === user.walletAddress && rank <= 10) {
                        isEarly = true;
                        break;
                    }
                }
                if (uniqueTippers.size > 10) break;
            }

            if (isEarly) {
                await this.awardBadge(senderId, 'Early Supporter');
            }
        }

        // 2. Artist Badges
        // artistId in payload is User UUID (as per context)
        // We count tips where the related Artist has this User ID
        const tipsReceived = await this.tipRepo.count({
            where: {
                artist: { user: { id: artistId } },
                status: TipStatus.VERIFIED
            },
            relations: ['artist', 'artist.user']
        });

        if (tipsReceived >= 1) await this.awardBadge(artistId, 'First Tip Received');
        if (tipsReceived >= 100) await this.awardBadge(artistId, '100 Tips Received');
    }



    @OnEvent('track.uploaded', { async: true })
    async handleTrackUploaded(payload: TrackUploadedEvent) {
        const { artistId } = payload;
        const artist = await this.artistRepo.findOne({ where: { id: artistId }, relations: ['user'] });
        if (!artist || !artist.user) return;

        const trackCount = await this.trackRepo.count({ where: { artistId } });
        if (trackCount >= 1) await this.awardBadge(artist.user.id, 'First Track Upload');
    }

    @OnEvent('track.played', { async: true })
    async handleTrackPlayed(payload: TrackPlayedEvent) {
        // This event fires on every play? That's heavy.
        // Ideally we check total plays for artist periodically or use atomic counters.
        // For MVP: Aggregate.
        const { artistId } = payload;
        const artist = await this.artistRepo.findOne({ where: { id: artistId }, relations: ['user'] });
        if (!artist || !artist.user) return;

        // aggregation
        const result = await this.trackRepo.createQueryBuilder('track')
            .select('SUM(track.plays)', 'total')
            .where('track.artistId = :artistId', { artistId })
            .getRawOne();

        const totalPlays = parseInt(result.total, 10) || 0;

        if (totalPlays >= 100) await this.awardBadge(artist.user.id, '100 Plays');
        if (totalPlays >= 1000) await this.awardBadge(artist.user.id, '1,000 Plays');
    }

    @OnEvent('user.followed', { async: true })
    async handleUserFollowed(payload: UserFollowedEvent) {
        const { followingId } = payload;
        // Check if following is artist
        // Wait, Follow entity has followingId. We need to see if that ID belongs to a User who is an Artist? 
        // Or is followingId the ArtistId?
        // Check Follow entity logic. Usually followingId is UserID.

        const user = await this.userRepo.findOne({ where: { id: followingId } });
        if (!user) return;

        if (user.isArtist) {
            const followers = await this.followRepo.count({
                where: {
                    followingId,
                    followingType: FollowingType.ARTIST
                }
            });
            if (followers >= 100) await this.awardBadge(user.id, 'Rising Star');
        }
    }

    private async awardBadge(userId: string, badgeName: string) {
        const badge = await this.badgeRepo.findOne({ where: { name: badgeName } });
        if (!badge) {
            this.logger.warn(`Badge not found: ${badgeName}`);
            return;
        }

        // Idempotency check
        const existing = await this.userBadgeRepo.findOne({ where: { userId, badgeId: badge.id } });
        if (existing) return;

        try {
            const userBadge = this.userBadgeRepo.create({
                userId,
                badgeId: badge.id,
            });
            await this.userBadgeRepo.save(userBadge);

            this.logger.log(`Awarded badge ${badgeName} to user ${userId}`);

            // Attach badge for notification
            userBadge.badge = badge;

            // Send achievement notification
            this.notificationsService.notifyUserOfBadge(userId, userBadge);

            // NFT Minting
            if (process.env.ENABLE_NFT_MINTING === 'true') {
                const txHash = await this.stellarService.mintBadge(userId, badge);
                if (txHash) {
                    userBadge.nftTxHash = txHash;
                    await this.userBadgeRepo.save(userBadge);
                }
            }
        } catch (error) {
            // Ignore unique constraint violation (race condition)
            if (error.code === '23505') return; // Postgres unique_violation
            this.logger.error(`Failed to award badge ${badgeName}: ${error.message}`);
        }
    }
}
