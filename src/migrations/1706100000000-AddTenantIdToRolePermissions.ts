import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

export class AddTenantIdToRolePermissions1706100000000 implements MigrationInterface {
  name = 'AddTenantIdToRolePermissions1706100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add tenant_id column to role_permissions table
    await queryRunner.addColumn(
      'role_permissions',
      new TableColumn({
        name: 'tenant_id',
        type: 'uuid',
        isNullable: false,
      })
    );

    // Add foreign key constraint for tenant_id
    await queryRunner.createForeignKey(
      'role_permissions',
      new TableForeignKey({
        columnNames: ['tenant_id'],
        referencedTableName: 'tenants',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      })
    );

    // Create index for tenant_id
    await queryRunner.createIndex(
      'role_permissions',
      new TableIndex({
        name: 'idx_role_permissions_tenant_id',
        columnNames: ['tenant_id'],
      })
    );

    // Update unique constraint to include tenant_id
    // First drop the existing unique constraint
    await queryRunner.query(`
      ALTER TABLE role_permissions 
      DROP CONSTRAINT IF EXISTS "UQ_role_permissions_role_id_permission_id"
    `);

    // Create new unique constraint with tenant_id
    await queryRunner.query(`
      ALTER TABLE role_permissions 
      ADD CONSTRAINT "UQ_role_permissions_role_id_permission_id_tenant_id" 
      UNIQUE (role_id, permission_id, tenant_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the new unique constraint
    await queryRunner.query(`
      ALTER TABLE role_permissions 
      DROP CONSTRAINT IF EXISTS "UQ_role_permissions_role_id_permission_id_tenant_id"
    `);

    // Restore the old unique constraint
    await queryRunner.query(`
      ALTER TABLE role_permissions 
      ADD CONSTRAINT "UQ_role_permissions_role_id_permission_id" 
      UNIQUE (role_id, permission_id)
    `);

    // Drop index for tenant_id
    await queryRunner.dropIndex('role_permissions', 'idx_role_permissions_tenant_id');

    // Drop foreign key constraint
    await queryRunner.query(`
      ALTER TABLE role_permissions 
      DROP CONSTRAINT IF EXISTS "FK_role_permissions_tenant_id"
    `);

    // Drop tenant_id column
    await queryRunner.dropColumn('role_permissions', 'tenant_id');
  }
}
