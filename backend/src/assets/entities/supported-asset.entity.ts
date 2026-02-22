import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Artist } from '../../artists/entities/artist.entity';

export enum AssetType {
  NATIVE = 'native',
  CREDIT_ALPHANUM4 = 'credit_alphanum4',
  CREDIT_ALPHANUM12 = 'credit_alphanum12',
}

@Entity('supported_assets')
export class SupportedAsset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 12 })
  assetCode: string;

  @Column({ length: 56, nullable: true })
  assetIssuer: string;

  @Column({
    type: 'enum',
    enum: AssetType,
    default: AssetType.CREDIT_ALPHANUM4,
  })
  assetType: AssetType;

  @Column({ default: true })
  isGlobal: boolean;

  @ManyToOne(() => Artist, { nullable: true })
  artist: Artist;

  @Column({ nullable: true })
  artistId: string;

  @Column({ default: true })
  isEnabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
