import {
  MigrationInterface,
  QueryRunner,
  Table,
} from 'typeorm';

export class AddPlaylistCollaborationAndSmartPlaylists1769302000000
  implements MigrationInterface
{
  name = 'AddPlaylistCollaborationAndSmartPlaylists1769302000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "playlist_collaborator_role_enum" AS ENUM ('owner', 'editor', 'viewer');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "playlist_collaborator_status_enum" AS ENUM ('pending', 'accepted');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "playlist_change_action_enum" AS ENUM ('add_track', 'remove_track', 'reorder_tracks');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "playlist_change_status_enum" AS ENUM ('pending', 'approved', 'rejected');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_enum e ON t.oid = e.enumtypid
          WHERE t.typname = 'activity_type_enum' AND e.enumlabel = 'playlist_track_added'
        ) THEN
          ALTER TYPE "activity_type_enum" ADD VALUE 'playlist_track_added';
        END IF;
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_enum e ON t.oid = e.enumtypid
          WHERE t.typname = 'activity_type_enum' AND e.enumlabel = 'playlist_track_removed'
        ) THEN
          ALTER TYPE "activity_type_enum" ADD VALUE 'playlist_track_removed';
        END IF;
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_enum e ON t.oid = e.enumtypid
          WHERE t.typname = 'activity_type_enum' AND e.enumlabel = 'playlist_collaborator_invited'
        ) THEN
          ALTER TYPE "activity_type_enum" ADD VALUE 'playlist_collaborator_invited';
        END IF;
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_enum e ON t.oid = e.enumtypid
          WHERE t.typname = 'activity_type_enum' AND e.enumlabel = 'playlist_collaborator_accepted'
        ) THEN
          ALTER TYPE "activity_type_enum" ADD VALUE 'playlist_collaborator_accepted';
        END IF;
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_enum e ON t.oid = e.enumtypid
          WHERE t.typname = 'activity_type_enum' AND e.enumlabel = 'playlist_collaborator_rejected'
        ) THEN
          ALTER TYPE "activity_type_enum" ADD VALUE 'playlist_collaborator_rejected';
        END IF;
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_enum e ON t.oid = e.enumtypid
          WHERE t.typname = 'activity_type_enum' AND e.enumlabel = 'playlist_collaborator_role_updated'
        ) THEN
          ALTER TYPE "activity_type_enum" ADD VALUE 'playlist_collaborator_role_updated';
        END IF;
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_enum e ON t.oid = e.enumtypid
          WHERE t.typname = 'activity_type_enum' AND e.enumlabel = 'playlist_collaborator_removed'
        ) THEN
          ALTER TYPE "activity_type_enum" ADD VALUE 'playlist_collaborator_removed';
        END IF;
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_enum e ON t.oid = e.enumtypid
          WHERE t.typname = 'activity_type_enum' AND e.enumlabel = 'playlist_change_requested'
        ) THEN
          ALTER TYPE "activity_type_enum" ADD VALUE 'playlist_change_requested';
        END IF;
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_enum e ON t.oid = e.enumtypid
          WHERE t.typname = 'activity_type_enum' AND e.enumlabel = 'playlist_change_approved'
        ) THEN
          ALTER TYPE "activity_type_enum" ADD VALUE 'playlist_change_approved';
        END IF;
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_enum e ON t.oid = e.enumtypid
          WHERE t.typname = 'activity_type_enum' AND e.enumlabel = 'playlist_change_rejected'
        ) THEN
          ALTER TYPE "activity_type_enum" ADD VALUE 'playlist_change_rejected';
        END IF;
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_enum e ON t.oid = e.enumtypid
          WHERE t.typname = 'activity_type_enum' AND e.enumlabel = 'smart_playlist_refreshed'
        ) THEN
          ALTER TYPE "activity_type_enum" ADD VALUE 'smart_playlist_refreshed';
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_enum e ON t.oid = e.enumtypid
          WHERE t.typname = 'entity_type_enum' AND e.enumlabel = 'playlist'
        ) THEN
          ALTER TYPE "entity_type_enum" ADD VALUE 'playlist';
        END IF;
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_enum e ON t.oid = e.enumtypid
          WHERE t.typname = 'entity_type_enum' AND e.enumlabel = 'smart_playlist'
        ) THEN
          ALTER TYPE "entity_type_enum" ADD VALUE 'smart_playlist';
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "playlists"
      ADD COLUMN IF NOT EXISTS "approval_required" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.createTable(
      new Table({
        name: 'playlist_collaborators',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'playlistId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'role',
            type: 'playlist_collaborator_role_enum',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'playlist_collaborator_status_enum',
            default: `'pending'`,
            isNullable: false,
          },
          {
            name: 'invited_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'accepted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
        uniques: [
          {
            name: 'UQ_playlist_collaborators_playlist_user',
            columnNames: ['playlistId', 'userId'],
          },
        ],
      }),
      true,
    );

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_playlist_collaborators_playlist_status"
      ON "playlist_collaborators" ("playlistId", "status")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_playlist_collaborators_user"
      ON "playlist_collaborators" ("userId")
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "playlist_collaborators" ADD CONSTRAINT "FK_playlist_collaborators_playlistId"
        FOREIGN KEY ("playlistId") REFERENCES "playlists"("id") ON DELETE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "playlist_collaborators" ADD CONSTRAINT "FK_playlist_collaborators_userId"
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_playlist_collaborators_owner"
      ON "playlist_collaborators" ("playlistId")
      WHERE role = 'owner' AND status = 'accepted'
    `);

    await queryRunner.createTable(
      new Table({
        name: 'smart_playlists',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'playlistId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'criteria',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'auto_update',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'last_updated',
            type: 'timestamp',
            isNullable: true,
          },
        ],
        uniques: [
          {
            name: 'UQ_smart_playlists_playlist',
            columnNames: ['playlistId'],
          },
        ],
      }),
      true,
    );

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_smart_playlists_playlist"
      ON "smart_playlists" ("playlistId")
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "smart_playlists" ADD CONSTRAINT "FK_smart_playlists_playlistId"
        FOREIGN KEY ("playlistId") REFERENCES "playlists"("id") ON DELETE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `);

    await queryRunner.createTable(
      new Table({
        name: 'playlist_change_requests',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'playlistId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'requested_by_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'action',
            type: 'playlist_change_action_enum',
            isNullable: false,
          },
          {
            name: 'payload',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'playlist_change_status_enum',
            default: `'pending'`,
            isNullable: false,
          },
          {
            name: 'reviewed_by_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'reviewed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_playlist_change_requests_playlist_status"
      ON "playlist_change_requests" ("playlistId", "status")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_playlist_change_requests_requested_by"
      ON "playlist_change_requests" ("requested_by_id")
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "playlist_change_requests" ADD CONSTRAINT "FK_playlist_change_requests_playlistId"
        FOREIGN KEY ("playlistId") REFERENCES "playlists"("id") ON DELETE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "playlist_change_requests" ADD CONSTRAINT "FK_playlist_change_requests_requested_by_id"
        FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "playlist_change_requests" ADD CONSTRAINT "FK_playlist_change_requests_reviewed_by_id"
        FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `);

    await queryRunner.query(`
      INSERT INTO "playlist_collaborators" ("playlistId", "userId", "role", "status", "invited_at", "accepted_at")
      SELECT p.id, p."userId", 'owner', 'accepted', p.created_at, p.created_at
      FROM "playlists" p
      WHERE NOT EXISTS (
        SELECT 1 FROM "playlist_collaborators" pc
        WHERE pc."playlistId" = p.id AND pc.role = 'owner' AND pc.status = 'accepted'
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('playlist_change_requests', true);
    await queryRunner.dropTable('smart_playlists', true);
    await queryRunner.dropTable('playlist_collaborators', true);

    await queryRunner.query(`
      ALTER TABLE "playlists"
      DROP COLUMN IF EXISTS "approval_required"
    `);

    await queryRunner.query(`DROP TYPE IF EXISTS "playlist_change_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "playlist_change_action_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "playlist_collaborator_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "playlist_collaborator_role_enum"`);
  }
}
