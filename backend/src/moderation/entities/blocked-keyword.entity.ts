import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Artist } from '../../artists/entities/artist.entity';

export enum KeywordSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

@Entity('blocked_keywords')
export class BlockedKeyword {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  keyword: string;

  @Column({
    type: 'enum',
    enum: KeywordSeverity,
  })
  severity: KeywordSeverity;

  @Column({ type: 'uuid' })
  addedById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'addedById' })
  addedBy: User;

  @Column({ type: 'uuid', nullable: true })
  artistId: string | null;

  @ManyToOne(() => Artist, { nullable: true })
  @JoinColumn({ name: 'artistId' })
  artist: Artist | null;

  @CreateDateColumn()
  createdAt: Date;
}

