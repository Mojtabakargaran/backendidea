import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditController } from './audit.controller';
import { AuditService } from './services/audit.service';
import { AuditLog } from '@/entities/audit-log.entity';
import { AuditExport } from '@/entities/audit-export.entity';
import { User } from '@/entities/user.entity';
import { UserSession } from '@/entities/user-session.entity';
import { Tenant } from '@/entities/tenant.entity';
import { I18nModule } from '@/i18n/i18n.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuditLog,
      AuditExport,
      User,
      UserSession,
      Tenant,
    ]),
    I18nModule,
  ],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
