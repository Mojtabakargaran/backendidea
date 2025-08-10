import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './services/inventory.service';
import { InventoryItem } from '../entities/inventory-item.entity';
import { InventoryItemStatusChange } from '../entities/inventory-item-status-change.entity';
import { InventoryExport } from '../entities/inventory-export.entity';
import { SerialNumberSequence } from '../entities/serial-number-sequence.entity';
import { Category } from '../entities/category.entity';
import { User } from '../entities/user.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { I18nModule } from '../i18n/i18n.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InventoryItem,
      InventoryItemStatusChange,
      InventoryExport,
      SerialNumberSequence,
      Category,
      User,
      AuditLog,
    ]),
    I18nModule,
    AuthModule,
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
