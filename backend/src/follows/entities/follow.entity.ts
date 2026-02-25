import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AppBaseEntity } from '../../common/entities/base.entity';

export enum FollowingType {
  ARTIST = 'artist',
  USER = 'user',
}

@Entity('follows')
@Unique(['followerId', 'followingId', 'followingType'])
@Index(['followerId', 'followingType'])
@Index(['followingId', 'followingType'])
@Index(['createdAt'])
export class Follow extends AppBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  followerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'followerId' })
  follower: User;

  @Column({ type: 'uuid' })
  followingId: string;

  @Column({
    type: 'enum',
    enum: FollowingType,
  })
  followingType: FollowingType;

  @Column({ type: 'boolean', default: true })
  notificationsEnabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
