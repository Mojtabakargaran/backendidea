import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

// Core entities
import { Tenant } from '../entities/tenant.entity';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { UserRole } from '../entities/user-role.entity';

// Authentication entities
import { EmailVerification } from '../entities/email-verification.entity';
import { UserSession } from '../entities/user-session.entity';
import { LoginAttempt } from '../entities/login-attempt.entity';
import { PasswordResetToken } from '../entities/password-reset-token.entity';

// Audit and permissions entities
import { AuditLog } from '../entities/audit-log.entity';
import { AuditExport } from '../entities/audit-export.entity';
import { Permission } from '../entities/permission.entity';
import { RolePermission } from '../entities/role-permission.entity';
import { PermissionCheck } from '../entities/permission-check.entity';

// Category management entities
import { Category } from '../entities/category.entity';

// Inventory management entities
import { InventoryItem } from '../entities/inventory-item.entity';
import { InventoryItemStatusChange } from '../entities/inventory-item-status-change.entity';
import { InventoryExport } from '../entities/inventory-export.entity';
import { SerialNumberSequence } from '../entities/serial-number-sequence.entity';

/**
 * Centralized entity registry
 * Add new entities here when implementing new features
 */
export const ALL_ENTITIES = [
  // Core entities
  Tenant,
  User,
  Role,
  UserRole,

  // Authentication entities
  EmailVerification,
  UserSession,
  LoginAttempt,
  PasswordResetToken,

  // Audit and permissions entities
  AuditLog,
  AuditExport,
  Permission,
  RolePermission,
  PermissionCheck,

  // Category management entities (?)
  Category,

  // Inventory management entities (?)
  InventoryItem,
  InventoryItemStatusChange,
  InventoryExport,
  SerialNumberSequence,

  // TODO: Add future entities here when implementing new features
  // Examples:
  // - Rental entities (?-?)
  // - Customer entities
  // - Payment entities
  // - Maintenance entities
];

export const databaseConfig = {
  type: 'postgres' as const,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'kargaran1367',
  database: process.env.DB_DATABASE || 'samanin_dev',
  entities: ALL_ENTITIES,
  migrations: ['src/migrations/*.ts'],
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development',
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
};

export const AppDataSource = new DataSource({
  ...databaseConfig,
  entities: ['src/entities/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
});

export const createTypeOrmConfig = (configService: ConfigService) => ({
  type: 'postgres' as const,
  host: configService.get('DB_HOST'),
  port: configService.get('DB_PORT'),
  username: configService.get('DB_USERNAME'),
  password: configService.get('DB_PASSWORD'),
  database: configService.get('DB_DATABASE'),
  entities: ALL_ENTITIES,
  synchronize: configService.get('NODE_ENV') === 'development',
  logging: configService.get('NODE_ENV') === 'development',
  ssl:
    configService.get('NODE_ENV') === 'production'
      ? { rejectUnauthorized: false }
      : false,
});
