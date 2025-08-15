import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseSeederService } from './database-seeder.service';
import { ALL_ENTITIES } from './database.config';
import { Role } from '@/entities/role.entity';
import { Permission } from '@/entities/permission.entity';
import { RolePermission } from '@/entities/role-permission.entity';
import { Category } from '@/entities/category.entity';
import { InventoryItem } from '@/entities/inventory-item.entity';

/**
 * Database Module
 * Handles database seeding and initialization
 * Centralized database configuration and entity management
 */
@Module({
  imports: [TypeOrmModule.forFeature([Role, Permission, RolePermission, Category, InventoryItem])],
  providers: [DatabaseSeederService],
  exports: [DatabaseSeederService],
})
export class DatabaseModule {}
