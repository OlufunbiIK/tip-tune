import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { GamificationService } from './gamification.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Badge } from './entities/badge.entity';
import { UserBadge } from './entities/user-badge.entity';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('gamification')
export class GamificationController {
    constructor(
        private readonly gamificationService: GamificationService,
        @InjectRepository(Badge)
        private readonly badgeRepo: Repository<Badge>,
        @InjectRepository(UserBadge)
        private readonly userBadgeRepo: Repository<UserBadge>,
    ) { }

    @Get('badges')
    async getAllBadges() {
        return this.badgeRepo.find({ order: { category: 'ASC', tier: 'ASC' } });
    }

    @UseGuards(JwtAuthGuard)
    @Get('user/:userId')
    async getUserBadges(@Param('userId') userId: string) {
        return this.userBadgeRepo.find({
            where: { userId },
            relations: ['badge'],
            order: { earnedAt: 'DESC' },
        });
    }
}
