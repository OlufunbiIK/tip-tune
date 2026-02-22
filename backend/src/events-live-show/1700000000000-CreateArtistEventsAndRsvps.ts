import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateArtistEventsAndRsvps1700000000000 implements MigrationInterface {
  name = 'CreateArtistEventsAndRsvps1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Create enum ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "public"."artist_events_event_type_enum"
      AS ENUM ('live_stream', 'concert', 'meet_greet', 'album_release')
    `);

    // ── artist_events table ──────────────────────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'artist_events',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'artist_id', type: 'uuid', isNullable: false },
          { name: 'title', type: 'varchar', length: '255', isNullable: false },
          { name: 'description', type: 'text', isNullable: false },
          { name: 'event_type', type: 'enum', enum: ['live_stream', 'concert', 'meet_greet', 'album_release'], isNullable: false },
          { name: 'start_time', type: 'timestamptz', isNullable: false },
          { name: 'end_time', type: 'timestamptz', isNullable: true },
          { name: 'venue', type: 'varchar', length: '255', isNullable: true },
          { name: 'stream_url', type: 'varchar', length: '500', isNullable: true },
          { name: 'ticket_url', type: 'varchar', length: '500', isNullable: true },
          { name: 'is_virtual', type: 'boolean', default: false },
          { name: 'rsvp_count', type: 'int', default: 0 },
          { name: 'reminder_sent', type: 'boolean', default: false },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );

    // ── Indexes on artist_events ─────────────────────────────────────────────
    await queryRunner.createIndex(
      'artist_events',
      new TableIndex({ name: 'IDX_artist_events_artist_id', columnNames: ['artist_id'] }),
    );
    await queryRunner.createIndex(
      'artist_events',
      new TableIndex({ name: 'IDX_artist_events_start_time', columnNames: ['start_time'] }),
    );
    await queryRunner.createIndex(
      'artist_events',
      new TableIndex({ name: 'IDX_artist_events_reminder_sent', columnNames: ['reminder_sent'] }),
    );

    // ── event_rsvps table ────────────────────────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'event_rsvps',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'event_id', type: 'uuid', isNullable: false },
          { name: 'user_id', type: 'uuid', isNullable: false },
          { name: 'reminder_enabled', type: 'boolean', default: true },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
        ],
        uniques: [{ name: 'UQ_event_rsvps_event_user', columnNames: ['event_id', 'user_id'] }],
      }),
      true,
    );

    // ── Indexes on event_rsvps ───────────────────────────────────────────────
    await queryRunner.createIndex(
      'event_rsvps',
      new TableIndex({ name: 'IDX_event_rsvps_user_id', columnNames: ['user_id'] }),
    );
    await queryRunner.createIndex(
      'event_rsvps',
      new TableIndex({ name: 'IDX_event_rsvps_event_id', columnNames: ['event_id'] }),
    );

    // ── Foreign key: event_rsvps.event_id → artist_events.id ────────────────
    await queryRunner.createForeignKey(
      'event_rsvps',
      new TableForeignKey({
        name: 'FK_event_rsvps_event_id',
        columnNames: ['event_id'],
        referencedTableName: 'artist_events',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('event_rsvps', 'FK_event_rsvps_event_id');
    await queryRunner.dropTable('event_rsvps');
    await queryRunner.dropTable('artist_events');
    await queryRunner.query(`DROP TYPE "public"."artist_events_event_type_enum"`);
  }
}
