import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  Table,
  TableIndex,
} from 'typeorm';

export class AddInventoryItemEditingFeatures1728055200000
  implements MigrationInterface
{
  name = 'AddInventoryItemEditingFeatures1728055200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add missing columns to inventory_items table
    await queryRunner.addColumns('inventory_items', [
      new TableColumn({
        name: 'version',
        type: 'int',
        default: 1,
        comment: 'Version for optimistic locking',
      }),
      new TableColumn({
        name: 'has_rental_history',
        type: 'boolean',
        default: false,
        comment: 'Whether the item has rental history',
      }),
      new TableColumn({
        name: 'last_status_change_reason',
        type: 'varchar',
        length: '500',
        isNullable: true,
        comment: 'Reason for last status change',
      }),
      new TableColumn({
        name: 'expected_resolution_date',
        type: 'timestamptz',
        isNullable: true,
        comment: 'Expected resolution date for maintenance/damaged items',
      }),
    ]);

    // Create inventory_item_status_changes table
    await queryRunner.createTable(
      new Table({
        name: 'inventory_item_status_changes',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'inventory_item_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'tenant_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'changed_by',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'previous_status',
            type: 'enum',
            enum: ['available', 'rented', 'maintenance', 'damaged', 'lost'],
            isNullable: false,
            comment: 'Previous availability status',
          },
          {
            name: 'new_status',
            type: 'enum',
            enum: ['available', 'rented', 'maintenance', 'damaged', 'lost'],
            isNullable: false,
            comment: 'New availability status',
          },
          {
            name: 'change_reason',
            type: 'varchar',
            length: '500',
            isNullable: true,
            comment: 'Reason for status change',
          },
          {
            name: 'expected_resolution_date',
            type: 'timestamptz',
            isNullable: true,
            comment: 'Expected resolution date for maintenance/damaged items',
          },
          {
            name: 'change_type',
            type: 'enum',
            enum: ['manual', 'automatic'],
            default: "'manual'",
            comment: 'Type of status change (manual or automatic)',
          },
          {
            name: 'ip_address',
            type: 'varchar',
            length: '45',
            isNullable: true,
            comment: 'IP address of the user making the change',
          },
          {
            name: 'user_agent',
            type: 'text',
            isNullable: true,
            comment: 'User agent string',
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            name: 'fk_inventory_item_status_changes_inventory_item_id',
            columnNames: ['inventory_item_id'],
            referencedTableName: 'inventory_items',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            name: 'fk_inventory_item_status_changes_tenant_id',
            columnNames: ['tenant_id'],
            referencedTableName: 'tenants',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            name: 'fk_inventory_item_status_changes_changed_by',
            columnNames: ['changed_by'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          },
        ],
      }),
      true,
    );

    // Create indexes for inventory_item_status_changes
    await queryRunner.createIndex(
      'inventory_item_status_changes',
      new TableIndex({
        name: 'idx_inventory_item_status_changes_item_id_created_at',
        columnNames: ['inventory_item_id', 'created_at'],
      }),
    );

    await queryRunner.createIndex(
      'inventory_item_status_changes',
      new TableIndex({
        name: 'idx_inventory_item_status_changes_tenant_id',
        columnNames: ['tenant_id'],
      }),
    );

    await queryRunner.createIndex(
      'inventory_item_status_changes',
      new TableIndex({
        name: 'idx_inventory_item_status_changes_changed_by',
        columnNames: ['changed_by'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.dropIndex(
      'inventory_item_status_changes',
      'idx_inventory_item_status_changes_changed_by',
    );
    await queryRunner.dropIndex(
      'inventory_item_status_changes',
      'idx_inventory_item_status_changes_tenant_id',
    );
    await queryRunner.dropIndex(
      'inventory_item_status_changes',
      'idx_inventory_item_status_changes_item_id_created_at',
    );

    // Drop the status changes table
    await queryRunner.dropTable('inventory_item_status_changes');

    // Remove added columns from inventory_items table
    await queryRunner.dropColumns('inventory_items', [
      'version',
      'has_rental_history',
      'last_status_change_reason',
      'expected_resolution_date',
    ]);
  }
}
