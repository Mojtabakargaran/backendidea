import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Migration for authentication enhancement - adds user sessions, login attempts, and password reset tokens
 * Implements database schema for ?, ?, ?, ?
 */
export class CreateAuthenticationTables1704537200000
  implements MigrationInterface
{
  name = 'CreateAuthenticationTables1704537200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add missing columns to users table
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN IF NOT EXISTS "last_login_ip" varchar(45),
      ADD COLUMN IF NOT EXISTS "lock_reason" varchar(500),
      ADD COLUMN IF NOT EXISTS "password_changed_at" timestamp,
      ADD COLUMN IF NOT EXISTS "password_reset_required" boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS "security_questions_set" boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS "two_factor_enabled" boolean DEFAULT false
    `);

    // Create user_sessions table
    await queryRunner.createTable(
      new Table({
        name: 'user_sessions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'tenant_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'session_token',
            type: 'varchar',
            length: '255',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'csrf_token',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'ip_address',
            type: 'varchar',
            length: '45',
            isNullable: false,
          },
          {
            name: 'user_agent',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'device_fingerprint',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'expired', 'invalidated', 'logged_out'],
            default: "'active'",
          },
          {
            name: 'last_activity_at',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'expires_at',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'login_method',
            type: 'enum',
            enum: ['email_password', 'password_reset'],
            default: "'email_password'",
          },
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
        foreignKeys: [
          {
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['tenant_id'],
            referencedTableName: 'tenants',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    // Create login_attempts table
    await queryRunner.createTable(
      new Table({
        name: 'login_attempts',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '320',
            isNullable: false,
          },
          {
            name: 'ip_address',
            type: 'varchar',
            length: '45',
            isNullable: false,
          },
          {
            name: 'user_agent',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'attempt_type',
            type: 'enum',
            enum: ['login', 'password_reset'],
            default: "'login'",
          },
          {
            name: 'status',
            type: 'enum',
            enum: [
              'success',
              'failed_invalid_credentials',
              'failed_account_locked',
              'failed_rate_limited',
              'failed_user_not_found',
            ],
            isNullable: false,
          },
          {
            name: 'failure_reason',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'tenant_context',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'session_created',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
          {
            columnNames: ['tenant_context'],
            referencedTableName: 'tenants',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
          {
            columnNames: ['session_created'],
            referencedTableName: 'user_sessions',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
      }),
      true,
    );

    // Create password_reset_tokens table
    await queryRunner.createTable(
      new Table({
        name: 'password_reset_tokens',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
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
            name: 'token_hash',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'used', 'expired', 'invalidated'],
            default: "'pending'",
          },
          {
            name: 'ip_address',
            type: 'varchar',
            length: '45',
            isNullable: false,
          },
          {
            name: 'user_agent',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'expires_at',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'used_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'used_ip_address',
            type: 'varchar',
            length: '45',
            isNullable: true,
          },
          {
            name: 'used_user_agent',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'invalidated_reason',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
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
        foreignKeys: [
          {
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    // Create indexes for performance and security monitoring
    await queryRunner.createIndex(
      'user_sessions',
      new TableIndex({
        name: 'idx_user_sessions_user_id',
        columnNames: ['user_id'],
      }),
    );
    await queryRunner.createIndex(
      'user_sessions',
      new TableIndex({
        name: 'idx_user_sessions_session_token',
        columnNames: ['session_token'],
      }),
    );
    await queryRunner.createIndex(
      'user_sessions',
      new TableIndex({
        name: 'idx_user_sessions_status',
        columnNames: ['status'],
      }),
    );
    await queryRunner.createIndex(
      'user_sessions',
      new TableIndex({
        name: 'idx_user_sessions_expires_at',
        columnNames: ['expires_at'],
      }),
    );

    await queryRunner.createIndex(
      'login_attempts',
      new TableIndex({
        name: 'idx_login_attempts_ip_address_created_at',
        columnNames: ['ip_address', 'created_at'],
      }),
    );
    await queryRunner.createIndex(
      'login_attempts',
      new TableIndex({
        name: 'idx_login_attempts_user_id_created_at',
        columnNames: ['user_id', 'created_at'],
      }),
    );
    await queryRunner.createIndex(
      'login_attempts',
      new TableIndex({
        name: 'idx_login_attempts_email_created_at',
        columnNames: ['email', 'created_at'],
      }),
    );
    await queryRunner.createIndex(
      'login_attempts',
      new TableIndex({
        name: 'idx_login_attempts_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'password_reset_tokens',
      new TableIndex({
        name: 'idx_password_reset_tokens_user_id',
        columnNames: ['user_id'],
      }),
    );
    await queryRunner.createIndex(
      'password_reset_tokens',
      new TableIndex({
        name: 'idx_password_reset_tokens_token_hash',
        columnNames: ['token_hash'],
      }),
    );
    await queryRunner.createIndex(
      'password_reset_tokens',
      new TableIndex({
        name: 'idx_password_reset_tokens_status',
        columnNames: ['status'],
      }),
    );
    await queryRunner.createIndex(
      'password_reset_tokens',
      new TableIndex({
        name: 'idx_password_reset_tokens_expires_at',
        columnNames: ['expires_at'],
      }),
    );

    // Create partial unique constraint for user_sessions (only one active session per user)
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_user_sessions_user_active 
      ON user_sessions (user_id) 
      WHERE status = 'active'
    `);

    // Create partial unique constraint for password_reset_tokens (only one pending token per user)
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_password_reset_tokens_user_pending 
      ON password_reset_tokens (user_id) 
      WHERE status = 'pending'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.dropTable('password_reset_tokens');
    await queryRunner.dropTable('login_attempts');
    await queryRunner.dropTable('user_sessions');

    // Remove added columns from users table
    await queryRunner.query(`
      ALTER TABLE "users" 
      DROP COLUMN IF EXISTS "last_login_ip",
      DROP COLUMN IF EXISTS "lock_reason",
      DROP COLUMN IF EXISTS "password_changed_at",
      DROP COLUMN IF EXISTS "password_reset_required",
      DROP COLUMN IF EXISTS "security_questions_set",
      DROP COLUMN IF EXISTS "two_factor_enabled"
    `);
  }
}
