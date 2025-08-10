import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreateInitialTables1704451200000 implements MigrationInterface {
  name = 'CreateInitialTables1704451200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create tenants table
    await queryRunner.createTable(
      new Table({
        name: 'tenants',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'company_name',
            type: 'varchar',
            length: '200',
            isNullable: false,
          },
          {
            name: 'language',
            type: 'enum',
            enum: ['persian', 'arabic'],
            isNullable: false,
            comment: 'UI language selection - permanent setting for the tenant',
          },
          {
            name: 'locale',
            type: 'enum',
            enum: ['iran', 'uae'],
            isNullable: false,
            comment:
              'Regional locale selection - permanent setting for the tenant',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'inactive', 'suspended'],
            default: "'active'",
            isNullable: false,
          },
          {
            name: 'subscription_plan',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'max_users',
            type: 'int',
            default: 10,
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create roles table
    await queryRunner.createTable(
      new Table({
        name: 'roles',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'name',
            type: 'enum',
            enum: ['tenant_owner', 'admin', 'manager', 'employee', 'staff'],
            isUnique: true,
            isNullable: false,
            comment: 'System-defined role names',
          },
          {
            name: 'description',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'is_system_role',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create users table
    await queryRunner.createTable(
      new Table({
        name: 'users',
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
            name: 'full_name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '320',
            isUnique: true,
            isNullable: false,
            comment:
              'Email addresses must be unique across the entire platform (BR01)',
          },
          {
            name: 'password_hash',
            type: 'varchar',
            length: '255',
            isNullable: false,
            comment: 'Password hashed using bcrypt with minimum 12 rounds',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'inactive', 'pending_verification', 'suspended'],
            default: "'pending_verification'",
            isNullable: false,
          },
          {
            name: 'email_verified_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'last_login_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'login_attempts',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'locked_until',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create user_roles table
    await queryRunner.createTable(
      new Table({
        name: 'user_roles',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'role_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'tenant_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'assigned_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'assigned_reason',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'expires_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create email_verifications table
    await queryRunner.createTable(
      new Table({
        name: 'email_verifications',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'token',
            type: 'varchar',
            length: '255',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'verified', 'expired', 'failed'],
            default: "'pending'",
            isNullable: false,
          },
          {
            name: 'expires_at',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'verified_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'attempts',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'last_attempt_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'ip_address',
            type: 'varchar',
            length: '45',
            isNullable: true,
          },
          {
            name: 'user_agent',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Add foreign key constraints using raw SQL
    await queryRunner.query(`
      ALTER TABLE users 
      ADD CONSTRAINT FK_users_tenant_id 
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE user_roles 
      ADD CONSTRAINT FK_user_roles_user_id 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE user_roles 
      ADD CONSTRAINT FK_user_roles_role_id 
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE user_roles 
      ADD CONSTRAINT FK_user_roles_tenant_id 
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE user_roles 
      ADD CONSTRAINT FK_user_roles_assigned_by 
      FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE email_verifications 
      ADD CONSTRAINT FK_email_verifications_user_id 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    `);

    // Add unique constraint for user_roles (user_id, role_id, tenant_id)
    await queryRunner.query(`
      ALTER TABLE user_roles 
      ADD CONSTRAINT UQ_user_roles_user_role_tenant 
      UNIQUE (user_id, role_id, tenant_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop unique constraint first
    await queryRunner.query(`
      ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS UQ_user_roles_user_role_tenant
    `);

    // Drop foreign keys
    await queryRunner.dropForeignKey(
      'email_verifications',
      'FK_email_verifications_user_id',
    );
    await queryRunner.dropForeignKey('user_roles', 'FK_user_roles_assigned_by');
    await queryRunner.dropForeignKey('user_roles', 'FK_user_roles_tenant_id');
    await queryRunner.dropForeignKey('user_roles', 'FK_user_roles_role_id');
    await queryRunner.dropForeignKey('user_roles', 'FK_user_roles_user_id');
    await queryRunner.dropForeignKey('users', 'FK_users_tenant_id');

    // Drop tables
    await queryRunner.dropTable('email_verifications', true);
    await queryRunner.dropTable('user_roles', true);
    await queryRunner.dropTable('users', true);
    await queryRunner.dropTable('roles', true);
    await queryRunner.dropTable('tenants', true);
  }
}
