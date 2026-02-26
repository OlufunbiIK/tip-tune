import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddArtistDiscoveryFields1769800100000 implements MigrationInterface {
  name = 'AddArtistDiscoveryFields1769800100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'artists_status_enum') THEN
          CREATE TYPE "artists_status_enum" AS ENUM (
            'active',
            'on_tour',
            'recording',
            'on_break',
            'hiatus',
            'accepting_requests'
          );
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "artists"
      ADD COLUMN IF NOT EXISTS "status" "artists_status_enum" NOT NULL DEFAULT 'active'
    `);
    await queryRunner.query(`
      ALTER TABLE "artists"
      ADD COLUMN IF NOT EXISTS "country" character varying(2)
    `);
    await queryRunner.query(`
      ALTER TABLE "artists"
      ADD COLUMN IF NOT EXISTS "city" character varying
    `);
    await queryRunner.query(`
      ALTER TABLE "artists"
      ADD COLUMN IF NOT EXISTS "hasLocation" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "artists" DROP COLUMN IF EXISTS "hasLocation"`);
    await queryRunner.query(`ALTER TABLE "artists" DROP COLUMN IF EXISTS "city"`);
    await queryRunner.query(`ALTER TABLE "artists" DROP COLUMN IF EXISTS "country"`);
    await queryRunner.query(`ALTER TABLE "artists" DROP COLUMN IF EXISTS "status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "artists_status_enum"`);
  }
}
