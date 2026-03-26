import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreatePayoutReconciliationTables1770000001000 implements MigrationInterface {
  name = 'CreatePayoutReconciliationTables1770000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add pendingUsdc column to artist_balances if it doesn't exist
    await queryRunner.addColumn(
      'artist_balances',
      new (require('typeorm').TableColumn)({
        name: 'pendingUsdc',
        type: 'decimal',
        precision: 18,
        scale: 7,
        default: 0,
      }),
    );

    // Create artist_balance_audits table for financial auditability
    await queryRunner.createTable(
      new Table({
        name: 'artist_balance_audits',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'artistId', type: 'uuid', isNullable: false },
          { name: 'assetCode', type: 'varchar', length: '4', isNullable: false },
          {
            name: 'eventType',
            type: 'enum',
            enum: ['tip_credit', 'payout_request', 'payout_processing', 'payout_completed', 'payout_failed', 'manual_adjust'],
            isNullable: false,
          },
          { name: 'payoutRequestId', type: 'uuid', isNullable: true },
          { name: 'tipId', type: 'uuid', isNullable: true },
          { name: 'amount', type: 'decimal', precision: 18, scale: 7, isNullable: false },
          { name: 'balanceBefore', type: 'decimal', precision: 18, scale: 7, isNullable: false },
          { name: 'balanceAfter', type: 'decimal', precision: 18, scale: 7, isNullable: false },
          { name: 'pendingBefore', type: 'decimal', precision: 18, scale: 7, isNullable: false },
          { name: 'pendingAfter', type: 'decimal', precision: 18, scale: 7, isNullable: false },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'artist_balance_audits',
      new TableIndex({ name: 'IDX_artist_balance_audits_artistId', columnNames: ['artistId'] }),
    );

    await queryRunner.createIndex(
      'artist_balance_audits',
      new TableIndex({
        name: 'IDX_artist_balance_audits_payoutId',
        columnNames: ['payoutRequestId'],
      }),
    );

    await queryRunner.createIndex(
      'artist_balance_audits',
      new TableIndex({ name: 'IDX_artist_balance_audits_createdAt', columnNames: ['createdAt'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('artist_balance_audits', 'IDX_artist_balance_audits_createdAt');
    await queryRunner.dropIndex('artist_balance_audits', 'IDX_artist_balance_audits_payoutId');
    await queryRunner.dropIndex('artist_balance_audits', 'IDX_artist_balance_audits_artistId');
    await queryRunner.dropTable('artist_balance_audits');

    const table = await queryRunner.getTable('artist_balances');
    const column = table?.findColumnByName('pendingUsdc');
    if (column) {
      await queryRunner.dropColumn('artist_balances', column);
    }
  }
}
