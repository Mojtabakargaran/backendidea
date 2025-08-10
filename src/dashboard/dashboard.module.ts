import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from '../auth/services/dashboard.service';
import { User } from '@/entities/user.entity';
import { Tenant } from '@/entities/tenant.entity';
import { UserRole } from '@/entities/user-role.entity';
import { UserSession } from '@/entities/user-session.entity';
import { I18nModule } from '@/i18n/i18n.module';
import { AuthModule } from '../auth/auth.module';

/**
 * Dashboard Module
 * Handles dashboard-related functionality
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([User, Tenant, UserRole, UserSession]),
    I18nModule,
    AuthModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
