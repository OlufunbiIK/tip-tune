import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateLicensingTables1700000000000 implements MigrationInterface {
  name = 'CreateLicensingTables1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── track_licenses ────────────────────────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'track_licenses',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'track_id', type: 'uuid' },
          {
            name: 'license_type',
            type: 'enum',
            enum: ['all_rights_reserved', 'creative_commons', 'commercial', 'sync'],
            default: "'all_rights_reserved'",
          },
          { name: 'allow_remix', type: 'boolean', default: false },
          { name: 'allow_commercial_use', type: 'boolean', default: false },
          { name: 'allow_download', type: 'boolean', default: false },
          { name: 'require_attribution', type: 'boolean', default: true },
          { name: 'license_url', type: 'varchar', isNullable: true },
          { name: 'custom_terms', type: 'text', isNullable: true },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'track_licenses',
      new TableIndex({
        name: 'IDX_TRACK_LICENSES_TRACK_ID',
        columnNames: ['track_id'],
        isUnique: true,
      }),
    );

    // ── license_requests ──────────────────────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'license_requests',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'track_id', type: 'uuid' },
          { name: 'requester_id', type: 'uuid' },
          { name: 'intended_use', type: 'text' },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'approved', 'rejected'],
            default: "'pending'",
          },
          { name: 'response_message', type: 'text', isNullable: true },
          { name: 'responded_at', type: 'timestamp', isNullable: true },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'license_requests',
      new TableIndex({
        name: 'IDX_LICENSE_REQUESTS_TRACK_ID',
        columnNames: ['track_id'],
      }),
    );

    await queryRunner.createIndex(
      'license_requests',
      new TableIndex({
        name: 'IDX_LICENSE_REQUESTS_REQUESTER_ID',
        columnNames: ['requester_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('license_requests');
    await queryRunner.dropTable('track_licenses');
  }
}
