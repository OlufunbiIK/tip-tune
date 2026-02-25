import { MigrationInterface, QueryRunner, Table, TableIndex, TableUnique } from 'typeorm';

export class CreateUserBlocksAndMutes1740480000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create user_blocks table
    await queryRunner.createTable(
      new Table({
        name: 'user_blocks',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'blockerId',
            type: 'uuid',
          },
          {
            name: 'blockedId',
            type: 'uuid',
          },
          {
            name: 'reason',
            type: 'enum',
            enum: ['spam', 'harassment', 'inappropriate', 'other'],
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
    );

    // Create unique constraint for user_blocks
    await queryRunner.createUniqueConstraint(
      'user_blocks',
      new TableUnique({
        name: 'UQ_user_blocks_blocker_blocked',
        columnNames: ['blockerId', 'blockedId'],
      }),
    );

    // Create indexes for user_blocks
    await queryRunner.createIndex(
      'user_blocks',
      new TableIndex({
        name: 'IDX_user_blocks_blockerId',
        columnNames: ['blockerId'],
      }),
    );

    await queryRunner.createIndex(
      'user_blocks',
      new TableIndex({
        name: 'IDX_user_blocks_blockedId',
        columnNames: ['blockedId'],
      }),
    );

    // Create user_mutes table
    await queryRunner.createTable(
      new Table({
        name: 'user_mutes',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'muterId',
            type: 'uuid',
          },
          {
            name: 'mutedId',
            type: 'uuid',
          },
          {
            name: 'muteType',
            type: 'enum',
            enum: ['notifications', 'activity_feed', 'both'],
            default: "'both'",
          },
          {
            name: 'expiresAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
    );

    // Create unique constraint for user_mutes
    await queryRunner.createUniqueConstraint(
      'user_mutes',
      new TableUnique({
        name: 'UQ_user_mutes_muter_muted',
        columnNames: ['muterId', 'mutedId'],
      }),
    );

    // Create indexes for user_mutes
    await queryRunner.createIndex(
      'user_mutes',
      new TableIndex({
        name: 'IDX_user_mutes_muterId',
        columnNames: ['muterId'],
      }),
    );

    await queryRunner.createIndex(
      'user_mutes',
      new TableIndex({
        name: 'IDX_user_mutes_mutedId',
        columnNames: ['mutedId'],
      }),
    );

    await queryRunner.createIndex(
      'user_mutes',
      new TableIndex({
        name: 'IDX_user_mutes_expiresAt',
        columnNames: ['expiresAt'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('user_mutes');
    await queryRunner.dropTable('user_blocks');
  }
}
