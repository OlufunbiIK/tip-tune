import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateSubscriptionsTables1700000000000
  implements MigrationInterface
{
  name = 'CreateSubscriptionsTables1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum for subscription status
    await queryRunner.query(`
      CREATE TYPE "artist_subscriptions_status_enum" AS ENUM (
        'active', 'cancelled', 'expired', 'paused'
      )
    `);

    // ─── subscription_tiers ───────────────────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'subscription_tiers',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          { name: 'artist_id', type: 'uuid', isNullable: false },
          { name: 'name', type: 'varchar', length: '100', isNullable: false },
          { name: 'description', type: 'text', isNullable: true },
          {
            name: 'price_xlm',
            type: 'decimal',
            precision: 18,
            scale: 7,
            isNullable: false,
          },
          {
            name: 'price_usd',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'perks',
            type: 'jsonb',
            isNullable: false,
            default: "'[]'",
          },
          {
            name: 'max_subscribers',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'current_subscribers',
            type: 'integer',
            isNullable: false,
            default: 0,
          },
          {
            name: 'is_active',
            type: 'boolean',
            isNullable: false,
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
        checks: [
          {
            name: 'CHK_subscription_tiers_price_xlm',
            expression: 'price_xlm >= 0',
          },
          {
            name: 'CHK_subscription_tiers_price_usd',
            expression: 'price_usd >= 0',
          },
          {
            name: 'CHK_subscription_tiers_current_subscribers',
            expression: 'current_subscribers >= 0',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'subscription_tiers',
      new TableIndex({
        name: 'IDX_subscription_tiers_artist_id',
        columnNames: ['artist_id'],
      }),
    );

    // ─── artist_subscriptions ─────────────────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'artist_subscriptions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          { name: 'user_id', type: 'uuid', isNullable: false },
          { name: 'artist_id', type: 'uuid', isNullable: false },
          { name: 'tier_id', type: 'uuid', isNullable: false },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'cancelled', 'expired', 'paused'],
            enumName: 'artist_subscriptions_status_enum',
            isNullable: false,
            default: "'active'",
          },
          {
            name: 'stellar_tx_hash',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'start_date',
            type: 'timestamptz',
            isNullable: false,
          },
          {
            name: 'next_billing_date',
            type: 'timestamptz',
            isNullable: false,
          },
          {
            name: 'cancelled_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
        foreignKeys: [
          {
            name: 'FK_artist_subscriptions_tier_id',
            columnNames: ['tier_id'],
            referencedTableName: 'subscription_tiers',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'artist_subscriptions',
      new TableIndex({
        name: 'IDX_artist_subscriptions_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'artist_subscriptions',
      new TableIndex({
        name: 'IDX_artist_subscriptions_artist_status',
        columnNames: ['artist_id', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'artist_subscriptions',
      new TableIndex({
        name: 'IDX_artist_subscriptions_tier_id',
        columnNames: ['tier_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('artist_subscriptions', true);
    await queryRunner.dropTable('subscription_tiers', true);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "artist_subscriptions_status_enum"`,
    );
  }
}
