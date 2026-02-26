import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class AddPlatformFeesAndConfig1769500000000 implements MigrationInterface {
  name = 'AddPlatformFeesAndConfig1769500000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "artists"
      ADD COLUMN IF NOT EXISTS "isVerified" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "fee_collection_status_enum" AS ENUM ('pending', 'collected', 'waived');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.createTable(
      new Table({
        name: 'fee_configurations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'feePercentage',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'minimumFeeXLM',
            type: 'decimal',
            precision: 20,
            scale: 7,
            isNullable: true,
          },
          {
            name: 'maximumFeeXLM',
            type: 'decimal',
            precision: 20,
            scale: 7,
            isNullable: true,
          },
          {
            name: 'waivedForVerifiedArtists',
            type: 'boolean',
            isNullable: false,
            default: false,
          },
          {
            name: 'effectiveFrom',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'createdById',
            type: 'uuid',
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
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'fee_configurations',
      new TableIndex({
        name: 'IDX_fee_configurations_effective_from',
        columnNames: ['effectiveFrom'],
      }),
    );

    await queryRunner.createForeignKey(
      'fee_configurations',
      new TableForeignKey({
        columnNames: ['createdById'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'platform_fees',
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
            name: 'feePercentage',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'feeAmountXLM',
            type: 'decimal',
            precision: 20,
            scale: 7,
            isNullable: false,
          },
          {
            name: 'feeAmountUSD',
            type: 'decimal',
            precision: 20,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'collectionStatus',
            type: 'fee_collection_status_enum',
            isNullable: false,
            default: `'pending'`,
          },
          {
            name: 'stellarTxHash',
            type: 'varchar',
            length: '64',
            isNullable: true,
          },
          {
            name: 'collectedAt',
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
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'platform_fees',
      new TableIndex({
        name: 'IDX_platform_fees_tip',
        columnNames: ['tipId'],
      }),
    );

    await queryRunner.createIndex(
      'platform_fees',
      new TableIndex({
        name: 'IDX_platform_fees_created_at',
        columnNames: ['createdAt'],
      }),
    );

    await queryRunner.createForeignKey(
      'platform_fees',
      new TableForeignKey({
        columnNames: ['tipId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tips',
        onDelete: 'CASCADE',
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const platformFeesTable = await queryRunner.getTable('platform_fees');
    if (platformFeesTable) {
      const foreignKey = platformFeesTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('tipId') !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('platform_fees', foreignKey);
      }
    }

    const feeConfigsTable = await queryRunner.getTable('fee_configurations');
    if (feeConfigsTable) {
      const foreignKey = feeConfigsTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('createdById') !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('fee_configurations', foreignKey);
      }
    }

    await queryRunner.dropTable('platform_fees', true);
    await queryRunner.dropTable('fee_configurations', true);

    await queryRunner.query(`
      DO $$ BEGIN
        DROP TYPE IF EXISTS "fee_collection_status_enum";
      EXCEPTION
        WHEN undefined_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "artists"
      DROP COLUMN IF EXISTS "isVerified"
    `);
  }
}

