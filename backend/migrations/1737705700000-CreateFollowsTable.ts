import { MigrationInterface, QueryRunner, Table, TableIndex, TableUnique } from 'typeorm';

/**
 * Migration: Create follows table for the following/followers system.
 * - follows: followerId (User), followingId (Artist/User id), followingType (artist|user), notificationsEnabled
 *
 * Run: npx typeorm-ts-node-commonjs migration:run -d data-source.ts
 */
export class CreateFollowsTable1737705700000 implements MigrationInterface {
  name = 'CreateFollowsTable1737705700000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "follows_followingtype_enum" AS ENUM ('artist', 'user');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `);

    await queryRunner.createTable(
      new Table({
        name: 'follows',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'followerId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'followingId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'followingType',
            type: 'follows_followingtype_enum',
            isNullable: false,
          },
          {
            name: 'notificationsEnabled',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['followerId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    await queryRunner.createUniqueConstraint(
      'follows',
      new TableUnique({
        name: 'UQ_follows_followerId_followingId_followingType',
        columnNames: ['followerId', 'followingId', 'followingType'],
      }),
    );

    await queryRunner.createIndex(
      'follows',
      new TableIndex({
        name: 'IDX_follows_followerId_followingType',
        columnNames: ['followerId', 'followingType'],
      }),
    );

    await queryRunner.createIndex(
      'follows',
      new TableIndex({
        name: 'IDX_follows_followingId_followingType',
        columnNames: ['followingId', 'followingType'],
      }),
    );

    await queryRunner.createIndex(
      'follows',
      new TableIndex({
        name: 'IDX_follows_createdAt',
        columnNames: ['createdAt'],
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('follows', true);
    await queryRunner.query(`DROP TYPE "follows_followingtype_enum"`);
  }
}
