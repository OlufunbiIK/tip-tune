import { MigrationInterface, QueryRunner } from "typeorm";

export class GamificationInit1769225275000 implements MigrationInterface {
    name = 'GamificationInit1769225275000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
          DO $$ BEGIN
            CREATE TYPE "public"."badges_category_enum" AS ENUM('tipper', 'artist', 'special');
          EXCEPTION
            WHEN duplicate_object THEN null;
          END $$
        `);
        await queryRunner.query(`
          DO $$ BEGIN
            CREATE TYPE "public"."badges_tier_enum" AS ENUM('bronze', 'silver', 'gold', 'platinum');
          EXCEPTION
            WHEN duplicate_object THEN null;
          END $$
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "badges" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
                "name" character varying NOT NULL, 
                "description" text NOT NULL, 
                "category" "public"."badges_category_enum" NOT NULL, 
                "tier" "public"."badges_tier_enum" NOT NULL DEFAULT 'bronze', 
                "imageUrl" character varying, 
                "criteria" jsonb NOT NULL, 
                "nftAssetCode" character varying, 
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), 
                CONSTRAINT "UQ_badges_name" UNIQUE ("name"), 
                CONSTRAINT "PK_badges" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "user_badges" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
                "userId" uuid NOT NULL, 
                "badgeId" uuid NOT NULL, 
                "earnedAt" TIMESTAMP NOT NULL DEFAULT now(), 
                "nftTxHash" character varying, 
                CONSTRAINT "UQ_user_badges_user_badge" UNIQUE ("userId", "badgeId"), 
                CONSTRAINT "PK_user_badges" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_user_badges_userId" ON "user_badges" ("userId")`);

        await queryRunner.query(`
          DO $$ BEGIN
            ALTER TABLE "user_badges" ADD CONSTRAINT "FK_user_badges_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
          EXCEPTION
            WHEN duplicate_object THEN null;
          END $$
        `);
        await queryRunner.query(`
          DO $$ BEGIN
            ALTER TABLE "user_badges" ADD CONSTRAINT "FK_user_badges_badgeId" FOREIGN KEY ("badgeId") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
          EXCEPTION
            WHEN duplicate_object THEN null;
          END $$
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_badges" DROP CONSTRAINT "FK_user_badges_badgeId"`);
        await queryRunner.query(`ALTER TABLE "user_badges" DROP CONSTRAINT "FK_user_badges_userId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_user_badges_userId"`);
        await queryRunner.query(`DROP TABLE "user_badges"`);
        await queryRunner.query(`DROP TABLE "badges"`);
        await queryRunner.query(`DROP TYPE "public"."badges_tier_enum"`);
        await queryRunner.query(`DROP TYPE "public"."badges_category_enum"`);
    }
}
