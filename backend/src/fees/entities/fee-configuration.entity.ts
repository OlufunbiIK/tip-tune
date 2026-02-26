import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('fee_configurations')
@Index(['effectiveFrom'])
export class FeeConfiguration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  feePercentage: string;

  @Column({ type: 'decimal', precision: 20, scale: 7, nullable: true })
  minimumFeeXLM: string | null;

  @Column({ type: 'decimal', precision: 20, scale: 7, nullable: true })
  maximumFeeXLM: string | null;

  @Column({ type: 'boolean', default: false })
  waivedForVerifiedArtists: boolean;

  @Column({ type: 'timestamp' })
  effectiveFrom: Date;

  @Column({ type: 'uuid', nullable: true })
  createdById: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: User | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

