import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { LocaleModule } from './locale/locale.module';
import { UsersModule } from './users/users.module';
import { AuditModule } from './audit/audit.module';
import { PermissionsModule } from './permissions/permissions.module';
import { CategoriesModule } from './categories/categories.module';
import { InventoryModule } from './inventory/inventory.module';
import { DatabaseModule } from './database/database.module';
import { createTypeOrmConfig } from './database/database.config';

/**
 * Main Application Module
 * Configures the NestJS application with all required modules
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: createTypeOrmConfig,
      inject: [ConfigService],
    }),
    DatabaseModule,
    AuthModule,
    DashboardModule,
    LocaleModule,
    UsersModule,
    AuditModule,
    PermissionsModule,
    CategoriesModule,
    InventoryModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
