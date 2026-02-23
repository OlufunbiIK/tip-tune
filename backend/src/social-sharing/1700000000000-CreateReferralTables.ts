import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReferralTables1700000000000 implements MigrationInterface {
  name = 'CreateReferralTables1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enum type
    await queryRunner.query(`
      CREATE TYPE "public"."referral_codes_reward_type_enum"
      AS ENUM ('xlm_bonus', 'badge', 'subscription_discount')
    `);

    // referral_codes table
    await queryRunner.query(`
      CREATE TABLE "referral_codes" (
        "id"           UUID NOT NULL DEFAULT uuid_generate_v4(),
        "user_id"      UUID NOT NULL,
        "code"         VARCHAR(8) NOT NULL,
        "usage_count"  INTEGER NOT NULL DEFAULT 0,
        "max_usages"   INTEGER,
        "reward_type"  "public"."referral_codes_reward_type_enum" NOT NULL DEFAULT 'xlm_bonus',
        "reward_value" NUMERIC(18, 7) NOT NULL,
        "is_active"    BOOLEAN NOT NULL DEFAULT true,
        "expires_at"   TIMESTAMPTZ,
        "created_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_referral_codes" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_referral_codes_code" UNIQUE ("code")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_referral_codes_user_id" ON "referral_codes" ("user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_referral_codes_code" ON "referral_codes" ("code")`);

    // referrals table
    await queryRunner.query(`
      CREATE TABLE "referrals" (
        "id"                UUID NOT NULL DEFAULT uuid_generate_v4(),
        "referrer_id"       UUID NOT NULL,
        "referred_user_id"  UUID NOT NULL,
        "referral_code_id"  UUID NOT NULL,
        "reward_claimed"    BOOLEAN NOT NULL DEFAULT false,
        "reward_claimed_at" TIMESTAMPTZ,
        "created_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_referrals"                              PRIMARY KEY ("id"),
        CONSTRAINT "UQ_referrals_referrer_referred"            UNIQUE ("referrer_id", "referred_user_id"),
        CONSTRAINT "FK_referrals_referral_code"
          FOREIGN KEY ("referral_code_id") REFERENCES "referral_codes" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_referrals_referrer_id"      ON "referrals" ("referrer_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_referrals_referred_user_id" ON "referrals" ("referred_user_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "referrals"`);
    await queryRunner.query(`DROP TABLE "referral_codes"`);
    await queryRunner.query(`DROP TYPE "public"."referral_codes_reward_type_enum"`);
  }
}
