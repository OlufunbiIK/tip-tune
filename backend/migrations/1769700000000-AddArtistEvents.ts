import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class AddArtistEvents1769700000000 implements MigrationInterface {
  name = 'AddArtistEvents1769700000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "artist_event_type_enum" AS ENUM ('live_stream', 'concert', 'meet_greet', 'album_release');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.createTable(
      new Table({
        name: 'artist_events',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'artistId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'eventType',
            type: 'artist_event_type_enum',
            isNullable: false,
          },
          {
            name: 'startTime',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'endTime',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'venue',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'streamUrl',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'ticketUrl',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'isVirtual',
            type: 'boolean',
            default: false,
          },
          {
            name: 'rsvpCount',
            type: 'integer',
            default: 0,
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
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'artist_events',
      new TableIndex({
        name: 'IDX_artist_events_artist',
        columnNames: ['artistId', 'startTime'],
      }),
    );

    await queryRunner.createIndex(
      'artist_events',
      new TableIndex({
        name: 'IDX_artist_events_start',
        columnNames: ['startTime'],
      }),
    );

    await queryRunner.createForeignKey(
      'artist_events',
      new TableForeignKey({
        columnNames: ['artistId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'artists',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'event_rsvps',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'eventId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'reminderEnabled',
            type: 'boolean',
            default: true,
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
      'event_rsvps',
      new TableIndex({
        name: 'IDX_event_rsvps_event',
        columnNames: ['eventId'],
      }),
    );

    await queryRunner.createIndex(
      'event_rsvps',
      new TableIndex({
        name: 'IDX_event_rsvps_user',
        columnNames: ['userId'],
      }),
    );

    await queryRunner.createForeignKey(
      'event_rsvps',
      new TableForeignKey({
        columnNames: ['eventId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'artist_events',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'event_rsvps',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const rsvpTable = await queryRunner.getTable('event_rsvps');
    if (rsvpTable) {
      for (const fk of rsvpTable.foreignKeys) {
        await queryRunner.dropForeignKey('event_rsvps', fk);
      }
    }

    const eventsTable = await queryRunner.getTable('artist_events');
    if (eventsTable) {
      for (const fk of eventsTable.foreignKeys) {
        await queryRunner.dropForeignKey('artist_events', fk);
      }
    }

    await queryRunner.dropTable('event_rsvps', true);
    await queryRunner.dropTable('artist_events', true);

    await queryRunner.query(`
      DO $$ BEGIN
        DROP TYPE IF EXISTS "artist_event_type_enum";
      EXCEPTION
        WHEN undefined_object THEN null;
      END $$;
    `);
  }
}

