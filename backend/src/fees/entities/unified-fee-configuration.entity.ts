import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('fee_configurations')
@Index(['effectiveFrom'])
export class UnifiedFeeConfiguration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'fee_percentage', type: 'decimal', precision: 5, scale: 2 })
  feePercentage: number;

  @Column({ name: 'minimum_fee_xlm', type: 'decimal', precision: 20, scale: 7, nullable: true })
  minimumFeeXLM: number | null;

  @Column({ name: 'maximum_fee_xlm', type: 'decimal', precision: 20, scale: 7, nullable: true })
  maximumFeeXLM: number | null;

  @Column({ name: 'waived_for_verified_artists', type: 'boolean', default: false })
  waivedForVerifiedArtists: boolean;

  @Column({ name: 'effective_from', type: 'timestamp' })
  effectiveFrom: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
