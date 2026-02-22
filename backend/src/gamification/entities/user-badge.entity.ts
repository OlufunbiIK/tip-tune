import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Badge } from './badge.entity';

@Entity('user_badges')
@Unique(['userId', 'badgeId']) // Prevent duplicate badges
export class UserBadge {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    @Index()
    userId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column('uuid')
    badgeId: string;

    @ManyToOne(() => Badge, (badge) => badge.userBadges, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'badgeId' })
    badge: Badge;

    @CreateDateColumn()
    earnedAt: Date;

    @Column({ nullable: true })
    nftTxHash: string;
}
