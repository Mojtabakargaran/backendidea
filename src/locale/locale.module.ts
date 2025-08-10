import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocaleController } from './locale.controller';
import { LocaleFormattingService } from '@/auth/services/locale-formatting.service';
import { SessionAuthGuard } from '@/auth/guards/session-auth.guard';
import { I18nModule } from '@/i18n/i18n.module';
import { User } from '@/entities/user.entity';
import { Tenant } from '@/entities/tenant.entity';
import { UserSession } from '@/entities/user-session.entity';

/**
 * Locale Module
 * Handles locale-specific formatting configuration
 * Implements ? - Locale-Specific Formatting
 */
@Module({
  imports: [TypeOrmModule.forFeature([User, Tenant, UserSession]), I18nModule],
  controllers: [LocaleController],
  providers: [LocaleFormattingService, SessionAuthGuard],
  exports: [LocaleFormattingService],
})
export class LocaleModule {}
