import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('artist_balances')
export class ArtistBalance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  @Index()
  artistId: string;

  @Column({ type: 'decimal', precision: 18, scale: 7, default: 0 })
  xlmBalance: number;

  @Column({ type: 'decimal', precision: 18, scale: 7, default: 0 })
  usdcBalance: number;

  @Column({ type: 'decimal', precision: 18, scale: 7, default: 0 })
  pendingXlm: number;

  @UpdateDateColumn()
  lastUpdated: Date;
}
