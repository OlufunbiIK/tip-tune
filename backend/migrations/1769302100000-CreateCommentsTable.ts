import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Create comments and comment_likes tables
 * 
 * Run: npx typeorm-ts-node-commonjs migration:run -d data-source.ts
 */
export class CreateCommentsTable1769302100000 implements MigrationInterface {
  name = 'CreateCommentsTable1769302100000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Create comments table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "comments" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "track_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "content" text NOT NULL,
        "parent_comment_id" uuid,
        "likes_count" integer NOT NULL DEFAULT 0,
        "is_edited" boolean NOT NULL DEFAULT false,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create comment_likes table  
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "comment_likes" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "comment_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "UQ_comment_likes_comment_user" UNIQUE ("comment_id", "user_id")
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_comments_track_id" ON "comments" ("track_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_comments_user_id" ON "comments" ("user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_comments_parent_comment_id" ON "comments" ("parent_comment_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_comment_likes_comment_id" ON "comment_likes" ("comment_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_comment_likes_user_id" ON "comment_likes" ("user_id")
    `);

    // Create foreign keys
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "comments" ADD CONSTRAINT "FK_comments_track_id"
        FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "comments" ADD CONSTRAINT "FK_comments_user_id"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "comments" ADD CONSTRAINT "FK_comments_parent_comment_id"
        FOREIGN KEY ("parent_comment_id") REFERENCES "comments"("id") ON DELETE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "comment_likes" ADD CONSTRAINT "FK_comment_likes_comment_id"
        FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "comment_likes" ADD CONSTRAINT "FK_comment_likes_user_id"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "comment_likes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "comments"`);
  }
}
