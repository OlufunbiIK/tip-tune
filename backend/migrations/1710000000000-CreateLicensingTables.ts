import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateLicensingTables1710000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "license_type_enum" AS ENUM ('all_rights_reserved', 'creative_commons', 'commercial', 'sync')
    `);
    await queryRunner.query(`
      CREATE TYPE "license_request_status_enum" AS ENUM ('pending', 'approved', 'rejected')
    `);
    // Create Track Licenses Table
    await queryRunner.query(`
      CREATE TABLE "track_licenses" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "track_id" uuid NOT NULL,
        "licenseType" license_type_enum NOT NULL DEFAULT 'all_rights_reserved',
        "allowRemix" boolean NOT NULL DEFAULT false,
        "allowCommercialUse" boolean NOT NULL DEFAULT false,
        "allowDownload" boolean NOT NULL DEFAULT false,
        "requireAttribution" boolean NOT NULL DEFAULT true,
        "licenseUrl" character varying,
        "customTerms" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_track_licenses" PRIMARY KEY ("id"),
        CONSTRAINT "REL_track_id" UNIQUE ("track_id"),
        CONSTRAINT "FK_track_licenses_tracks" FOREIGN KEY ("track_id") 
          REFERENCES "tracks"("id") ON DELETE CASCADE
      )
    `);

    // Create License Requests Table
    await queryRunner.query(`
      CREATE TABLE "license_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "track_id" uuid NOT NULL,
        "requester_id" uuid NOT NULL,
        "intendedUse" text NOT NULL,
        "status" license_request_status_enum NOT NULL DEFAULT 'pending',
        "responseMessage" text,
        "respondedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_license_requests" PRIMARY KEY ("id"),
        CONSTRAINT "FK_license_requests_tracks" FOREIGN KEY ("track_id") 
          REFERENCES "tracks"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_license_requests_users" FOREIGN KEY ("requester_id") 
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // 3. Backfill: Assign default licenses to existing tracks
    await queryRunner.query(`
      INSERT INTO "track_licenses" ("track_id", "licenseType")
      SELECT "id", 'all_rights_reserved' FROM "tracks"
      ON CONFLICT ("track_id") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "license_requests"`);
    await queryRunner.query(`DROP TABLE "track_licenses"`);
    await queryRunner.query(`DROP TYPE "license_request_status_enum"`);
    await queryRunner.query(`DROP TYPE "license_type_enum"`);
  }
}
