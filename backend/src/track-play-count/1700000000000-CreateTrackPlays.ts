import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateTrackPlays1700000000000 implements MigrationInterface {
  name = 'CreateTrackPlays1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type
    await queryRunner.query(`
      CREATE TYPE "play_source_enum" AS ENUM (
        'search', 'playlist', 'artist_profile', 'tip_feed', 'direct'
      )
    `);

    await queryRunner.createTable(
      new Table({
        name: 'track_plays',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'track_id', type: 'uuid', isNullable: false },
          { name: 'user_id', type: 'uuid', isNullable: true },
          { name: 'session_id', type: 'varchar', length: '128', isNullable: false },
          { name: 'listen_duration', type: 'integer', isNullable: false },
          { name: 'completed_full', type: 'boolean', default: false },
          { name: 'source', type: 'play_source_enum', default: "'direct'" },
          { name: 'ip_hash', type: 'varchar', length: '64', isNullable: false },
          { name: 'counted_as_play', type: 'boolean', default: false },
          {
            name: 'played_at',
            type: 'timestamp with time zone',
            default: 'now()',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['track_id'],
            referencedTableName: 'tracks',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
      }),
      true,
    );

    // Performance indexes
    await queryRunner.createIndex(
      'track_plays',
      new TableIndex({
        name: 'IDX_track_plays_track_user_played',
        columnNames: ['track_id', 'user_id', 'played_at'],
      }),
    );
    await queryRunner.createIndex(
      'track_plays',
      new TableIndex({
        name: 'IDX_track_plays_track_session_played',
        columnNames: ['track_id', 'session_id', 'played_at'],
      }),
    );
    await queryRunner.createIndex(
      'track_plays',
      new TableIndex({
        name: 'IDX_track_plays_ip_track_played',
        columnNames: ['ip_hash', 'track_id', 'played_at'],
      }),
    );
    await queryRunner.createIndex(
      'track_plays',
      new TableIndex({
        name: 'IDX_track_plays_counted',
        columnNames: ['track_id', 'counted_as_play', 'played_at'],
      }),
    );

    // Add plays column to tracks if not present
    await queryRunner.query(`
      ALTER TABLE tracks
        ADD COLUMN IF NOT EXISTS plays integer NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('track_plays', true);
    await queryRunner.query(`DROP TYPE IF EXISTS "play_source_enum"`);
    await queryRunner.query(`ALTER TABLE tracks DROP COLUMN IF EXISTS plays`);
  }
}
