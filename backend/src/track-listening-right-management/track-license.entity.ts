import { Track } from "@/tracks/entities/track.entity";
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  OneToOne,
} from "typeorm";

export enum LicenseType {
  ALL_RIGHTS_RESERVED = "all_rights_reserved",
  CREATIVE_COMMONS = "creative_commons",
  COMMERCIAL = "commercial",
  SYNC = "sync",
}

@Entity("track_licenses")
export class TrackLicense {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "track_id" })
  trackId: string;

  @OneToOne(() => Track, (track) => track.license, { onDelete: "CASCADE" })
  @JoinColumn({ name: "track_id" })
  track: Track;

  @Column({
    type: "enum",
    enum: LicenseType,
    default: LicenseType.ALL_RIGHTS_RESERVED,
  })
  licenseType: LicenseType;

  @Column({ default: false })
  allowRemix: boolean;

  @Column({ default: false })
  allowCommercialUse: boolean;

  @Column({ default: false })
  allowDownload: boolean;

  @Column({ default: true })
  requireAttribution: boolean;

  @Column({ nullable: true })
  licenseUrl: string;

  @Column({ type: "text", nullable: true })
  customTerms: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
