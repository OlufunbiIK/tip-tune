import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateMetricsHistory1708693200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'metrics_history',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'metricName',
            type: 'varchar',
          },
          {
            name: 'value',
            type: 'decimal',
            precision: 20,
            scale: 6,
          },
          {
            name: 'labels',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'timestamp',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'metrics_history',
      new TableIndex({
        name: 'IDX_metrics_history_name_timestamp',
        columnNames: ['metricName', 'timestamp'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('metrics_history');
  }
}
