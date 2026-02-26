import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFeesTables1700000000000 implements MigrationInterface {
  name = 'CreateFeesTables1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type
    await queryRunner.query(`
      CREATE TYPE "fee_collection_status_enum" AS ENUM ('pending', 'collected', 'waived')
    `);

    // Fee configurations table (historical tracking)
    await queryRunner.query(`
      CREATE TABLE "fee_configurations" (
        "id"                          UUID NOT NULL DEFAULT gen_random_uuid(),
        "fee_percentage"              DECIMAL(5,2) NOT NULL,
        "minimum_fee_xlm"             DECIMAL(18,7) NOT NULL,
        "maximum_fee_xlm"             DECIMAL(18,7) NOT NULL,
        "waived_for_verified_artists" BOOLEAN NOT NULL DEFAULT false,
        "effective_from"              TIMESTAMP NOT NULL,
        "created_by"                  UUID NOT NULL,
        "created_at"                  TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "pk_fee_configurations" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_fee_configurations_effective_from"
        ON "fee_configurations" ("effective_from" DESC)
    `);

    // Platform fees ledger
    await queryRunner.query(`
      CREATE TABLE "platform_fees" (
        "id"                UUID NOT NULL DEFAULT gen_random_uuid(),
        "tip_id"            UUID NOT NULL,
        "fee_percentage"    DECIMAL(5,2) NOT NULL,
        "fee_amount_xlm"    DECIMAL(18,7) NOT NULL,
        "fee_amount_usd"    DECIMAL(18,4) NOT NULL,
        "collection_status" "fee_collection_status_enum" NOT NULL DEFAULT 'pending',
        "stellar_tx_hash"   VARCHAR(64),
        "collected_at"      TIMESTAMP,
        "created_at"        TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "pk_platform_fees" PRIMARY KEY ("id"),
        CONSTRAINT "uq_platform_fees_tip_id" UNIQUE ("tip_id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_platform_fees_tip_id"
        ON "platform_fees" ("tip_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_platform_fees_collection_status"
        ON "platform_fees" ("collection_status")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_platform_fees_created_at"
        ON "platform_fees" ("created_at" DESC)
    `);

    // Seed default fee configuration
    await queryRunner.query(`
      INSERT INTO "fee_configurations"
        ("fee_percentage", "minimum_fee_xlm", "maximum_fee_xlm", "waived_for_verified_artists", "effective_from", "created_by")
      VALUES
        (2.5, 0.1, 100, false, now(), '00000000-0000-0000-0000-000000000000')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "platform_fees"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "fee_configurations"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "fee_collection_status_enum"`);
  }
}
