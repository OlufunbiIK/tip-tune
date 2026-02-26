import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class AddMessageModeration1769600000000 implements MigrationInterface {
  name = 'AddMessageModeration1769600000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "keyword_severity_enum" AS ENUM ('low', 'medium', 'high');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "moderation_result_enum" AS ENUM ('approved', 'filtered', 'flagged', 'blocked');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "review_action_enum" AS ENUM ('approve', 'block');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.createTable(
      new Table({
        name: 'blocked_keywords',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'keyword',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'severity',
            type: 'keyword_severity_enum',
            isNullable: false,
          },
          {
            name: 'addedById',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'artistId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'blocked_keywords',
      new TableIndex({
        name: 'IDX_blocked_keywords_artist',
        columnNames: ['artistId'],
      }),
    );

    await queryRunner.createForeignKey(
      'blocked_keywords',
      new TableForeignKey({
        columnNames: ['addedById'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'blocked_keywords',
      new TableForeignKey({
        columnNames: ['artistId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'artists',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'message_moderation_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'tipId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'originalMessage',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'moderationResult',
            type: 'moderation_result_enum',
            isNullable: false,
          },
          {
            name: 'filterReason',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'confidenceScore',
            type: 'decimal',
            precision: 3,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'wasManuallyReviewed',
            type: 'boolean',
            default: false,
          },
          {
            name: 'reviewedById',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'reviewAction',
            type: 'review_action_enum',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'message_moderation_logs',
      new TableIndex({
        name: 'IDX_message_moderation_logs_tip',
        columnNames: ['tipId'],
      }),
    );

    await queryRunner.createIndex(
      'message_moderation_logs',
      new TableIndex({
        name: 'IDX_message_moderation_logs_created',
        columnNames: ['createdAt'],
      }),
    );

    await queryRunner.createForeignKey(
      'message_moderation_logs',
      new TableForeignKey({
        columnNames: ['tipId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tips',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'message_moderation_logs',
      new TableForeignKey({
        columnNames: ['reviewedById'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const moderationTable = await queryRunner.getTable('message_moderation_logs');
    if (moderationTable) {
      for (const fk of moderationTable.foreignKeys) {
        await queryRunner.dropForeignKey('message_moderation_logs', fk);
      }
    }

    const keywordsTable = await queryRunner.getTable('blocked_keywords');
    if (keywordsTable) {
      for (const fk of keywordsTable.foreignKeys) {
        await queryRunner.dropForeignKey('blocked_keywords', fk);
      }
    }

    await queryRunner.dropTable('message_moderation_logs', true);
    await queryRunner.dropTable('blocked_keywords', true);

    await queryRunner.query(`
      DO $$ BEGIN
        DROP TYPE IF EXISTS "keyword_severity_enum";
      EXCEPTION
        WHEN undefined_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        DROP TYPE IF EXISTS "moderation_result_enum";
      EXCEPTION
        WHEN undefined_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        DROP TYPE IF EXISTS "review_action_enum";
      EXCEPTION
        WHEN undefined_object THEN null;
      END $$;
    `);
  }
}

