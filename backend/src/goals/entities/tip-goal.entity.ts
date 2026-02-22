import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Artist } from '../../artists/entities/artist.entity';
import { Tip } from '../../tips/entities/tip.entity';
// Use forward reference pattern if needed, but circular imports in TypeORM are usually fine with arrow functions
// Re-importing to ensure file system sync
import { GoalSupporter } from './goal-supporter.entity';

export enum GoalStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
}

@Entity('tip_goals')
@Index(['artistId', 'status'])
export class TipGoal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  artistId: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'decimal', precision: 20, scale: 7 })
  goalAmount: number;

  @Column({ type: 'decimal', precision: 20, scale: 7, default: 0 })
  currentAmount: number;

  @Column({ type: 'timestamp' })
  deadline: Date;

  @Column({
    type: 'enum',
    enum: GoalStatus,
    default: GoalStatus.ACTIVE,
  })
  status: GoalStatus;

  @Column({ type: 'jsonb', nullable: true })
  rewards: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Artist, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'artistId' })
  artist: Artist;

  @OneToMany(() => Tip, (tip) => tip.goal)
  tips: Tip[];

  @OneToMany(() => GoalSupporter, (supporter: GoalSupporter) => supporter.goal)
  supporters: GoalSupporter[];
}
