import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Create collaborations table
 * 
 * Run: npx typeorm-ts-node-commonjs migration:run -d data-source.ts
 */
export class CreateCollaborationsTable1769302200000 implements MigrationInterface {
  name = 'CreateCollaborationsTable1769302200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "collaborations_role_enum" AS ENUM ('primary', 'featured', 'producer', 'composer', 'mixer');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "collaborations_approvalstatus_enum" AS ENUM ('pending', 'approved', 'rejected');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `);

    // Create collaborations table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "collaborations" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "trackId" uuid NOT NULL,
        "artistId" uuid NOT NULL,
        "role" "collaborations_role_enum" NOT NULL DEFAULT 'featured',
        "splitPercentage" decimal(5, 2) NOT NULL,
        "approvalStatus" "collaborations_approvalstatus_enum" NOT NULL DEFAULT 'pending',
        "invitationMessage" text,
        "rejectionReason" text,
        "respondedAt" timestamp,
        "createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "UQ_collaborations_track_artist" UNIQUE ("trackId", "artistId")
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_collaborations_trackId" ON "collaborations" ("trackId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_collaborations_artistId" ON "collaborations" ("artistId")
    `);

    // Create foreign keys
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "collaborations" ADD CONSTRAINT "FK_collaborations_trackId"
        FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "collaborations" ADD CONSTRAINT "FK_collaborations_artistId"
        FOREIGN KEY ("artistId") REFERENCES "artists"("id") ON DELETE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "collaborations"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "collaborations_approvalstatus_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "collaborations_role_enum"`);
  }
}
