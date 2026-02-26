import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateAdminSystem1769400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create admin_roles table
    await queryRunner.createTable(
      new Table({
        name: 'admin_roles',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
          },
          {
            name: 'role',
            type: 'enum',
            enum: ['super_admin', 'moderator', 'support', 'analyst'],
          },
          {
            name: 'permissions',
            type: 'jsonb',
          },
          {
            name: 'grantedBy',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Create admin_audit_logs table
    await queryRunner.createTable(
      new Table({
        name: 'admin_audit_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'adminId',
            type: 'uuid',
          },
          {
            name: 'action',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'entityType',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'entityId',
            type: 'uuid',
          },
          {
            name: 'previousState',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'newState',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'ipAddress',
            type: 'varchar',
            length: '45',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Add foreign keys for admin_roles
    await queryRunner.createForeignKey(
      'admin_roles',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'admin_roles',
      new TableForeignKey({
        columnNames: ['grantedBy'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    );

    // Add foreign key for admin_audit_logs
    await queryRunner.createForeignKey(
      'admin_audit_logs',
      new TableForeignKey({
        columnNames: ['adminId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Add indexes for admin_audit_logs
    await queryRunner.createIndex(
      'admin_audit_logs',
      new TableIndex({
        name: 'IDX_admin_audit_logs_admin_created',
        columnNames: ['adminId', 'createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'admin_audit_logs',
      new TableIndex({
        name: 'IDX_admin_audit_logs_entity',
        columnNames: ['entityType', 'entityId'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('admin_audit_logs', 'IDX_admin_audit_logs_entity');
    await queryRunner.dropIndex('admin_audit_logs', 'IDX_admin_audit_logs_admin_created');

    // Drop foreign keys
    const adminAuditLogsTable = await queryRunner.getTable('admin_audit_logs');
    const adminAuditLogsForeignKeys = adminAuditLogsTable.foreignKeys.filter(
      (fk) => fk.columnNames.indexOf('adminId') !== -1,
    );
    for (const fk of adminAuditLogsForeignKeys) {
      await queryRunner.dropForeignKey('admin_audit_logs', fk);
    }

    const adminRolesTable = await queryRunner.getTable('admin_roles');
    const adminRolesForeignKeys = adminRolesTable.foreignKeys.filter(
      (fk) =>
        fk.columnNames.indexOf('userId') !== -1 ||
        fk.columnNames.indexOf('grantedBy') !== -1,
    );
    for (const fk of adminRolesForeignKeys) {
      await queryRunner.dropForeignKey('admin_roles', fk);
    }

    // Drop tables
    await queryRunner.dropTable('admin_audit_logs');
    await queryRunner.dropTable('admin_roles');
  }
}
