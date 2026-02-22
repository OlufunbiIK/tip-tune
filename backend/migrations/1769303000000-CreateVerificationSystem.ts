import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateVerificationSystem1769303000000
  implements MigrationInterface
{
  name = 'CreateVerificationSystem1769303000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Create verification_status_enum
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "verification_status_enum" AS ENUM ('pending', 'approved', 'rejected');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Add is_verified column to artists table
    await queryRunner.query(`
      ALTER TABLE "artists"
      ADD COLUMN IF NOT EXISTS "is_verified" boolean NOT NULL DEFAULT false
    `);

    // Create index on is_verified
    await queryRunner.createIndex(
      'artists',
      new TableIndex({
        name: 'IDX_artists_is_verified',
        columnNames: ['is_verified'],
      }),
    );

    // Create verification_requests table
    await queryRunner.createTable(
      new Table({
        name: 'verification_requests',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'artist_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'verification_status_enum',
            default: "'pending'",
            isNullable: false,
          },
          {
            name: 'documents',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'social_proof',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'additional_info',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'reviewed_by_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'review_notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'submitted_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'reviewed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'verification_requests',
      new TableIndex({
        name: 'IDX_verification_requests_artist_id',
        columnNames: ['artist_id'],
      }),
    );

    await queryRunner.createIndex(
      'verification_requests',
      new TableIndex({
        name: 'IDX_verification_requests_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'verification_requests',
      new TableIndex({
        name: 'IDX_verification_requests_submitted_at',
        columnNames: ['submitted_at'],
      }),
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'verification_requests',
      new TableForeignKey({
        columnNames: ['artist_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'artists',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'verification_requests',
      new TableForeignKey({
        columnNames: ['reviewed_by_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    );

    // Add VERIFICATION_UPDATE to notification_type_enum
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_enum e ON t.oid = e.enumtypid
          WHERE t.typname = 'notification_type_enum' AND e.enumlabel = 'VERIFICATION_UPDATE'
        ) THEN
          ALTER TYPE "notification_type_enum" ADD VALUE 'VERIFICATION_UPDATE';
        END IF;
      END $$;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    const table = await queryRunner.getTable('verification_requests');
    const foreignKeys = table?.foreignKeys || [];
    for (const foreignKey of foreignKeys) {
      await queryRunner.dropForeignKey('verification_requests', foreignKey);
    }

    // Drop indexes
    await queryRunner.dropIndex(
      'verification_requests',
      'IDX_verification_requests_artist_id',
    );
    await queryRunner.dropIndex(
      'verification_requests',
      'IDX_verification_requests_status',
    );
    await queryRunner.dropIndex(
      'verification_requests',
      'IDX_verification_requests_submitted_at',
    );

    // Drop table
    await queryRunner.dropTable('verification_requests', true);

    // Drop is_verified column from artists
    await queryRunner.dropIndex('artists', 'IDX_artists_is_verified');
    await queryRunner.query(`
      ALTER TABLE "artists"
      DROP COLUMN IF EXISTS "is_verified"
    `);

    // Drop enum
    await queryRunner.query(`DROP TYPE IF EXISTS "verification_status_enum"`);
  }
}
