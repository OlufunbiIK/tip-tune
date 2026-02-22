import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { UserBadge } from './user-badge.entity';

export enum BadgeCategory {
    TIPPER = 'tipper',
    ARTIST = 'artist',
    SPECIAL = 'special',
}

export enum BadgeTier {
    BRONZE = 'bronze',
    SILVER = 'silver',
    GOLD = 'gold',
    PLATINUM = 'platinum',
}

@Entity('badges')
export class Badge {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    name: string;

    @Column('text')
    description: string;

    @Column({
        type: 'enum',
        enum: BadgeCategory,
    })
    category: BadgeCategory;

    @Column({
        type: 'enum',
        enum: BadgeTier,
        default: BadgeTier.BRONZE,
    })
    tier: BadgeTier;

    @Column({ nullable: true })
    imageUrl: string;

    @Column('jsonb')
    criteria: Record<string, any>;

    @Column({ nullable: true })
    nftAssetCode: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @OneToMany(() => UserBadge, (userBadge) => userBadge.badge)
    userBadges: UserBadge[];
}
