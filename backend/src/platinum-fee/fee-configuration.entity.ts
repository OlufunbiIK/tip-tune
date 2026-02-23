import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('fee_configurations')
@Index(['effectiveFrom'])
export class FeeConfiguration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'fee_percentage', type: 'decimal', precision: 5, scale: 2 })
  feePercentage: number;

  @Column({ name: 'minimum_fee_xlm', type: 'decimal', precision: 18, scale: 7 })
  minimumFeeXLM: number;

  @Column({ name: 'maximum_fee_xlm', type: 'decimal', precision: 18, scale: 7 })
  maximumFeeXLM: number;

  @Column({ name: 'waived_for_verified_artists', type: 'boolean', default: false })
  waivedForVerifiedArtists: boolean;

  @Column({ name: 'effective_from', type: 'timestamp' })
  effectiveFrom: Date;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
