import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GamificationService } from './gamification.service';
import { Badge } from './entities/badge.entity';
import { UserBadge } from './entities/user-badge.entity';
import { Tip } from '../tips/entities/tip.entity';
import { Track } from '../tracks/entities/track.entity';
import { Artist } from '../artists/entities/artist.entity';
import { User } from '../users/entities/user.entity';
import { Follow } from '../follows/entities/follow.entity';
import { StellarModule } from '../stellar/stellar.module';
import { NotificationsModule } from '../notifications/notifications.module';

import { GamificationController } from './gamification.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([Badge, UserBadge, Tip, Track, Artist, User, Follow]),
        StellarModule,
        NotificationsModule,
    ],
    controllers: [GamificationController],
    providers: [GamificationService],
    exports: [GamificationService],
})
export class GamificationModule { }
