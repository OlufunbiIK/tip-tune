import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateArtistStatusTables1769900000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create artist_statuses table
    await queryRunner.createTable(
      new Table({
        name: 'artist_statuses',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'artistId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'statusType',
            type: 'enum',
            enum: ['active', 'on_tour', 'recording', 'on_break', 'hiatus', 'accepting_requests'],
            default: "'active'",
          },
          {
            name: 'statusMessage',
            type: 'varchar',
            length: '160',
            isNullable: true,
          },
          {
            name: 'emoji',
            type: 'varchar',
            length: '10',
            isNullable: true,
          },
          {
            name: 'showOnProfile',
            type: 'boolean',
            default: true,
          },
          {
            name: 'autoResetAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            name: 'FK_artist_statuses_artistId',
            columnNames: ['artistId'],
            referencedTableName: 'artists',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    // Create indexes for artist_statuses
    await queryRunner.createIndex(
      'artist_statuses',
      new TableIndex({
        name: 'IDX_artist_status_artistId',
        columnNames: ['artistId'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'artist_statuses',
      new TableIndex({
        name: 'IDX_artist_status_updatedAt',
        columnNames: ['updatedAt'],
      }),
    );

    // Create status_histories table
    await queryRunner.createTable(
      new Table({
        name: 'status_histories',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'artistId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'artistStatusId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'statusType',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'statusMessage',
            type: 'varchar',
            length: '160',
            isNullable: true,
          },
          {
            name: 'setAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'clearedAt',
            type: 'timestamp',
            isNullable: true,
          },
        ],
        foreignKeys: [
          {
            name: 'FK_status_histories_artistId',
            columnNames: ['artistId'],
            referencedTableName: 'artists',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            name: 'FK_status_histories_artistStatusId',
            columnNames: ['artistStatusId'],
            referencedTableName: 'artist_statuses',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
      }),
      true,
    );

    // Create indexes for status_histories
    await queryRunner.createIndex(
      'status_histories',
      new TableIndex({
        name: 'IDX_status_history_artistId',
        columnNames: ['artistId'],
      }),
    );

    await queryRunner.createIndex(
      'status_histories',
      new TableIndex({
        name: 'IDX_status_history_setAt',
        columnNames: ['setAt'],
      }),
    );

    await queryRunner.createIndex(
      'status_histories',
      new TableIndex({
        name: 'IDX_status_history_artistId_setAt',
        columnNames: ['artistId', 'setAt'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop status_histories table and indexes
    await queryRunner.dropTable('status_histories', true);

    // Drop artist_statuses table and indexes
    await queryRunner.dropTable('artist_statuses', true);
  }
}
