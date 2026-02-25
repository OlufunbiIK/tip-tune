import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateTrackWaveforms1740459181000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'track_waveforms',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'trackId',
            type: 'uuid',
            isUnique: true,
          },
          {
            name: 'waveformData',
            type: 'jsonb',
          },
          {
            name: 'dataPoints',
            type: 'int',
            default: 200,
          },
          {
            name: 'peakAmplitude',
            type: 'decimal',
            precision: 10,
            scale: 6,
          },
          {
            name: 'generationStatus',
            type: 'enum',
            enum: ['pending', 'processing', 'completed', 'failed'],
            default: "'pending'",
          },
          {
            name: 'processingDurationMs',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'retryCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'track_waveforms',
      new TableForeignKey({
        columnNames: ['trackId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tracks',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('track_waveforms');
    const foreignKey = table.foreignKeys.find(fk => fk.columnNames.indexOf('trackId') !== -1);
    await queryRunner.dropForeignKey('track_waveforms', foreignKey);
    await queryRunner.dropTable('track_waveforms');
  }
}
