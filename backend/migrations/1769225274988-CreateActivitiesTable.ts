import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Migration: Create activities table for activity feed feature
 * 
 * This migration creates the activities table to track user activities
 * such as new tracks, tips sent/received, and artist follows.
 * 
 * Run: npx typeorm-ts-node-commonjs migration:run -d data-source.ts
 */
export class CreateActivitiesTable1769225274988 implements MigrationInterface {
  name = 'CreateActivitiesTable1769225274988';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types for PostgreSQL
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "activity_type_enum" AS ENUM ('new_track', 'tip_sent', 'tip_received', 'artist_followed', 'new_follower');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "entity_type_enum" AS ENUM ('track', 'tip', 'artist');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create activities table using raw SQL for proper enum support
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "activities" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "activityType" "activity_type_enum" NOT NULL,
        "entityType" "entity_type_enum" NOT NULL,
        "entityId" uuid NOT NULL,
        "metadata" jsonb,
        "isSeen" boolean NOT NULL DEFAULT false,
        "createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await queryRunner.createIndex(
      'activities',
      new TableIndex({
        name: 'IDX_activities_userId_createdAt',
        columnNames: ['userId', 'createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'activities',
      new TableIndex({
        name: 'IDX_activities_userId_activityType',
        columnNames: ['userId', 'activityType'],
      }),
    );

    await queryRunner.createIndex(
      'activities',
      new TableIndex({
        name: 'IDX_activities_userId_isSeen',
        columnNames: ['userId', 'isSeen'],
      }),
    );

    await queryRunner.createIndex(
      'activities',
      new TableIndex({
        name: 'IDX_activities_entityType_entityId',
        columnNames: ['entityType', 'entityId'],
      }),
    );

    // Create foreign key to users table (skip if exists)
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "activities" ADD CONSTRAINT "FK_5a2cfe6f705df945b20c1b22c71" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    const table = await queryRunner.getTable('activities');
    if (table) {
      const foreignKey = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('userId') !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('activities', foreignKey);
      }
    }

    // Drop indexes
    await queryRunner.dropIndex('activities', 'IDX_activities_entityType_entityId');
    await queryRunner.dropIndex('activities', 'IDX_activities_userId_isSeen');
    await queryRunner.dropIndex('activities', 'IDX_activities_userId_activityType');
    await queryRunner.dropIndex('activities', 'IDX_activities_userId_createdAt');

    // Drop table
    await queryRunner.dropTable('activities');

    // Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS "entity_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "activity_type_enum"`);
  }
}
