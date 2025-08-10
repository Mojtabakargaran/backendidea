import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../entities/category.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { UserSession } from '../entities/user-session.entity';
import { User } from '../entities/user.entity';
import { Tenant } from '../entities/tenant.entity';
import { Permission } from '../entities/permission.entity';
import { RolePermission } from '../entities/role-permission.entity';
import { PermissionCheck } from '../entities/permission-check.entity';
import { UserRole } from '../entities/user-role.entity';
import { Role } from '../entities/role.entity';
import { CategoriesService } from './services/categories.service';
import { CategoriesController } from './categories.controller';
import { AuthModule } from '../auth/auth.module';
import { PermissionsService } from '../permissions/permissions.service';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { I18nModule } from '../i18n/i18n.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Category, 
      AuditLog,
      InventoryItem,
      UserSession, 
      User, 
      Tenant,
      Permission,
      RolePermission,
      PermissionCheck,
      UserRole,
      Role,
    ]),
    AuthModule,
    I18nModule,
  ],
  controllers: [CategoriesController],
  providers: [
    CategoriesService,
    PermissionsService,
    PermissionsGuard,
  ],
  exports: [CategoriesService],
})
export class CategoriesModule {}
