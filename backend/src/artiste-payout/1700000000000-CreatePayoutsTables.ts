import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreatePayoutsTables1700000000000 implements MigrationInterface {
  name = 'CreatePayoutsTables1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // artist_balances
    await queryRunner.createTable(
      new Table({
        name: 'artist_balances',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'artistId', type: 'uuid', isUnique: true, isNullable: false },
          { name: 'xlmBalance', type: 'decimal', precision: 18, scale: 7, default: 0 },
          { name: 'usdcBalance', type: 'decimal', precision: 18, scale: 7, default: 0 },
          { name: 'pendingXlm', type: 'decimal', precision: 18, scale: 7, default: 0 },
          { name: 'lastUpdated', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'artist_balances',
      new TableIndex({ name: 'IDX_artist_balances_artistId', columnNames: ['artistId'] }),
    );

    // payout_requests
    await queryRunner.createTable(
      new Table({
        name: 'payout_requests',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'artistId', type: 'uuid', isNullable: false },
          { name: 'amount', type: 'decimal', precision: 18, scale: 7, isNullable: false },
          { name: 'assetCode', type: 'varchar', length: '12', isNullable: false },
          { name: 'destinationAddress', type: 'varchar', length: '56', isNullable: false },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'processing', 'completed', 'failed'],
            default: "'pending'",
          },
          { name: 'stellarTxHash', type: 'varchar', length: '64', isNullable: true },
          { name: 'failureReason', type: 'text', isNullable: true },
          { name: 'requestedAt', type: 'timestamp', default: 'now()' },
          { name: 'processedAt', type: 'timestamp', isNullable: true },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'payout_requests',
      new TableIndex({ name: 'IDX_payout_requests_artistId', columnNames: ['artistId'] }),
    );

    await queryRunner.createIndex(
      'payout_requests',
      new TableIndex({ name: 'IDX_payout_requests_artistId_status', columnNames: ['artistId', 'status'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('payout_requests');
    await queryRunner.dropTable('artist_balances');
  }
}
