import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';
import { EmailService } from './services/email.service';
import { DashboardService } from './services/dashboard.service';
import { LocaleFormattingService } from './services/locale-formatting.service';
import { SessionAuthGuard } from './guards/session-auth.guard';
import { PermissionsService } from '@/permissions/permissions.service';
import { I18nModule } from '@/i18n/i18n.module';
import { DatabaseModule } from '@/database/database.module';
import { User } from '@/entities/user.entity';
import { Tenant } from '@/entities/tenant.entity';
import { Role } from '@/entities/role.entity';
import { UserRole } from '@/entities/user-role.entity';
import { EmailVerification } from '@/entities/email-verification.entity';
import { UserSession } from '@/entities/user-session.entity';
import { LoginAttempt } from '@/entities/login-attempt.entity';
import { PasswordResetToken } from '@/entities/password-reset-token.entity';
import { Permission } from '@/entities/permission.entity';
import { RolePermission } from '@/entities/role-permission.entity';
import { PermissionCheck } from '@/entities/permission-check.entity';

/**
 * Authentication Module
 * Provides user authentication, session management, and password reset functionality
 * Implements ? - User Registration with Tenant Creation
 * Implements ? - User Login Authentication
 * Implements ? - User Logout
 * Implements ? - Password Reset Request
 * Implements ? - Password Reset Completion
 * Implements ? - Dashboard Access and Loading
 */
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      User,
      Tenant,
      Role,
      UserRole,
      EmailVerification,
      UserSession,
      LoginAttempt,
      PasswordResetToken,
      Permission,
      RolePermission,
      PermissionCheck,
    ]),
    I18nModule,
    DatabaseModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    EmailService,
    DashboardService,
    LocaleFormattingService,
    SessionAuthGuard,
    PermissionsService,
  ],
  exports: [
    AuthService,
    EmailService,
    DashboardService,
    LocaleFormattingService,
    SessionAuthGuard,
    PermissionsService,
    TypeOrmModule, // Export TypeOrmModule to make repositories available to importing modules
  ],
})
export class AuthModule {}
