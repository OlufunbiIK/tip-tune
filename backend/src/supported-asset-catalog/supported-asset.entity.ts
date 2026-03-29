import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum AssetScope {
  GLOBAL = 'global',
  ARTIST = 'artist',
}

/**
 * Represents a Stellar asset that TipTune supports.
 *
 * XLM is modelled as code="XLM", issuer=null.
 * Every other asset MUST have a non-null issuer (the issuing Stellar account).
 *
 * Scope rules
 * -----------
 * - scope=GLOBAL  → visible to every artist; artistId must be null
 * - scope=ARTIST  → visible only to the owning artist; artistId must be set
 */
@Entity('supported_assets')
@Index(['code', 'issuer'], { unique: true })
export class SupportedAsset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Stellar asset code, e.g. "XLM", "USDC", "TIP" */
  @Column({ length: 12 })
  code: string;

  /**
   * Issuing Stellar account public key.
   * NULL only for the native asset (XLM).
   */
  @Column({ type: 'varchar', length: 56, nullable: true, default: null })
  issuer: string | null;

  /** Human-readable display name */
  @Column({ length: 64 })
  name: string;

  /** Optional logo URL */
  @Column({ type: 'varchar', nullable: true, default: null })
  logoUrl: string | null;

  /** Decimal precision used for display / conversion rounding */
  @Column({ type: 'smallint', default: 7 })
  decimals: number;

  @Column({
    type: 'enum',
    enum: AssetScope,
    default: AssetScope.GLOBAL,
  })
  scope: AssetScope;

  /**
   * Set when scope=ARTIST.  References the artist's user/profile id.
   */
  @Column({ type: 'varchar', nullable: true, default: null })
  @Index()
  artistId: string | null;

  /** Admins can soft-disable an asset without deleting it */
  @Column({ default: true })
  isEnabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // ── helpers ──────────────────────────────────────────────────────────────

  /** True when this is the Stellar native asset */
  get isNative(): boolean {
    return this.code === 'XLM' && this.issuer === null;
  }

  /**
   * Stable key used for cache / de-dup lookups.
   * XLM → "XLM:native"
   * Other → "USDC:G..."
   */
  get catalogKey(): string {
    return `${this.code}:${this.issuer ?? 'native'}`;
  }
}
