import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class AddInventoryExportEntity1725471457000
  implements MigrationInterface
{
  name = 'AddInventoryExportEntity1725471457000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create inventory_exports table
    await queryRunner.createTable(
      new Table({
        name: 'inventory_exports',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'tenant_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'exported_by',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'export_format',
            type: 'enum',
            enum: ['pdf', 'excel', 'csv', 'json'],
            isNullable: false,
            comment: 'Format of the export file',
          },
          {
            name: 'export_type',
            type: 'enum',
            enum: ['single_item', 'multiple_items', 'full_inventory'],
            isNullable: false,
            comment: 'Type of export operation',
          },
          {
            name: 'item_ids',
            type: 'jsonb',
            isNullable: true,
            comment: 'Array of inventory item IDs being exported',
          },
          {
            name: 'export_options',
            type: 'jsonb',
            isNullable: true,
            comment: 'Export configuration options',
          },
          {
            name: 'record_count',
            type: 'int',
            isNullable: false,
            comment: 'Number of records in the export',
          },
          {
            name: 'file_size_bytes',
            type: 'bigint',
            isNullable: true,
            comment: 'Size of the export file in bytes',
          },
          {
            name: 'file_path',
            type: 'varchar',
            length: '500',
            isNullable: true,
            comment: 'Path to the generated export file',
          },
          {
            name: 'file_hash',
            type: 'varchar',
            length: '255',
            isNullable: true,
            comment: 'Hash of the export file for integrity verification',
          },
          {
            name: 'ip_address',
            type: 'varchar',
            length: '45',
            isNullable: false,
            comment: 'IP address of the user who initiated the export',
          },
          {
            name: 'user_agent',
            type: 'text',
            isNullable: true,
            comment: 'User agent string from the export request',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['initiated', 'processing', 'completed', 'failed'],
            default: "'initiated'",
            comment: 'Current status of the export operation',
          },
          {
            name: 'failure_reason',
            type: 'varchar',
            length: '500',
            isNullable: true,
            comment: 'Reason for export failure, if applicable',
          },
          {
            name: 'download_count',
            type: 'int',
            default: 0,
            comment: 'Number of times the export file has been downloaded',
          },
          {
            name: 'last_downloaded_at',
            type: 'timestamp',
            isNullable: true,
            comment: 'Timestamp of the last download',
          },
          {
            name: 'expires_at',
            type: 'timestamp',
            isNullable: false,
            comment: 'When the export file will expire and be deleted',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
            comment: 'Timestamp when the export was initiated',
          },
          {
            name: 'completed_at',
            type: 'timestamp',
            isNullable: true,
            comment: 'Timestamp when the export was completed',
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'inventory_exports',
      new TableIndex({
        name: 'IDX_inventory_exports_tenant_exported_by',
        columnNames: ['tenant_id', 'exported_by'],
      }),
    );

    await queryRunner.createIndex(
      'inventory_exports',
      new TableIndex({
        name: 'IDX_inventory_exports_tenant_status',
        columnNames: ['tenant_id', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'inventory_exports',
      new TableIndex({
        name: 'IDX_inventory_exports_expires_at',
        columnNames: ['expires_at'],
      }),
    );

    // Create foreign key constraints
    await queryRunner.createForeignKey(
      'inventory_exports',
      new TableForeignKey({
        columnNames: ['tenant_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tenants',
        onDelete: 'CASCADE',
        name: 'FK_inventory_exports_tenant',
      }),
    );

    await queryRunner.createForeignKey(
      'inventory_exports',
      new TableForeignKey({
        columnNames: ['exported_by'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
        name: 'FK_inventory_exports_user',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.dropForeignKey(
      'inventory_exports',
      'FK_inventory_exports_user',
    );
    await queryRunner.dropForeignKey(
      'inventory_exports',
      'FK_inventory_exports_tenant',
    );

    // Drop indexes
    await queryRunner.dropIndex(
      'inventory_exports',
      'IDX_inventory_exports_expires_at',
    );
    await queryRunner.dropIndex(
      'inventory_exports',
      'IDX_inventory_exports_tenant_status',
    );
    await queryRunner.dropIndex(
      'inventory_exports',
      'IDX_inventory_exports_tenant_exported_by',
    );

    // Drop table
    await queryRunner.dropTable('inventory_exports');
  }
}
