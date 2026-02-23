import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateModerationTables1710100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "severity_enum" AS ENUM ('low', 'medium', 'high')
    `);
    // Create Blocked Keywords Table
    await queryRunner.query(`
      CREATE TABLE "blocked_keywords" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "keyword" character varying NOT NULL,
        "severity" severity_enum NOT NULL DEFAULT 'medium',
        "artistId" uuid,
        "addedById" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_blocked_keywords" PRIMARY KEY ("id"),
        CONSTRAINT "FK_blocked_keywords_users" FOREIGN KEY ("addedById") 
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_keyword" ON "blocked_keywords" ("keyword")`,
    );

    // Create Moderation Logs Table
    await queryRunner.query(`
      CREATE TABLE "message_moderation_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tipId" uuid NOT NULL,
        "originalMessage" text NOT NULL,
        "moderationResult" character varying NOT NULL,
        "filterReason" character varying,
        "confidenceScore" numeric(3,2) NOT NULL DEFAULT 1.0,
        "wasManuallyReviewed" boolean NOT NULL DEFAULT false,
        "reviewedById" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_message_moderation_logs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_moderation_logs_tips" FOREIGN KEY ("tipId") 
          REFERENCES "tips"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_moderation_logs_users" FOREIGN KEY ("reviewedById") 
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "message_moderation_logs"`);
    await queryRunner.query(`DROP TABLE "blocked_keywords"`);
  }
}
