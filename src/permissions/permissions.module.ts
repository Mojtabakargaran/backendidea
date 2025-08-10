import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  PermissionsController,
  RolesController,
} from './permissions.controller';
import { PermissionsService } from './permissions.service';
import { Permission } from '../entities/permission.entity';
import { RolePermission } from '../entities/role-permission.entity';
import { PermissionCheck } from '../entities/permission-check.entity';
import { Role } from '../entities/role.entity';
import { UserRole } from '../entities/user-role.entity';
import { User } from '../entities/user.entity';
import { Tenant } from '../entities/tenant.entity';
import { UserSession } from '../entities/user-session.entity';
import { I18nModule } from '../i18n/i18n.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Permission,
      RolePermission,
      PermissionCheck,
      Role,
      UserRole,
      User,
      Tenant,
      UserSession,
    ]),
    AuthModule, // For SessionAuthGuard
    I18nModule,
    forwardRef(() => UsersModule), // For UsersService
  ],
  controllers: [PermissionsController, RolesController],
  providers: [PermissionsService],
  exports: [PermissionsService],
})
export class PermissionsModule {}
