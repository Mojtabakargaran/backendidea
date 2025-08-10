import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './services/users.service';
import { ProfileService } from './services/profile.service';
import { User } from '@/entities/user.entity';
import { Role } from '@/entities/role.entity';
import { UserRole } from '@/entities/user-role.entity';
import { AuditLog } from '@/entities/audit-log.entity';
import { EmailVerification } from '@/entities/email-verification.entity';
import { Tenant } from '@/entities/tenant.entity';
import { UserSession } from '@/entities/user-session.entity';
import { PasswordResetToken } from '@/entities/password-reset-token.entity';
import { AuthModule } from '@/auth/auth.module';
import { I18nModule } from '@/i18n/i18n.module';
import { PermissionsModule } from '@/permissions/permissions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Role,
      UserRole,
      AuditLog,
      EmailVerification,
      Tenant,
      UserSession,
      PasswordResetToken,
    ]),
    AuthModule, // For EmailService and SessionAuthGuard
    I18nModule,
    forwardRef(() => PermissionsModule), // For PermissionsService
  ],
  controllers: [UsersController],
  providers: [UsersService, ProfileService],
  exports: [UsersService, ProfileService],
})
export class UsersModule {}
