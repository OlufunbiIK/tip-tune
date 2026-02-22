import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TipGoal } from './tip-goal.entity';
import { User } from '../../users/entities/user.entity';

@Entity('goal_supporters')
@Index(['goalId'])
@Index(['userId'])
export class GoalSupporter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  goalId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'decimal', precision: 20, scale: 7 })
  amountContributed: number;

  @Column({ nullable: true })
  rewardTier: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => TipGoal, (goal) => goal.supporters, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'goalId' })
  goal: TipGoal;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
