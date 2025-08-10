import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  IsNumber,
  IsDateString,
  IsIn,
} from 'class-validator';

/**
 * Dashboard Tenant Information DTO
 */
export class DashboardTenantDto {
  @ApiProperty({
    description: 'Tenant unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    description: 'Company name',
    example: 'Acme Corporation',
  })
  @IsString()
  companyName: string;

  @ApiProperty({
    description: 'Tenant registration date',
    example: '2025-01-15T10:30:00Z',
    format: 'date-time',
  })
  @IsDateString()
  registrationDate: string;

  @ApiProperty({
    description: 'Current number of users in tenant',
    example: 1,
    minimum: 1,
  })
  @IsNumber()
  userCount: number;

  @ApiProperty({
    description: 'Current tenant status',
    example: 'active',
    enum: ['active', 'inactive'],
  })
  @IsIn(['active', 'inactive'])
  status: string;
}

/**
 * Dashboard User Information DTO
 */
export class DashboardUserDto {
  @ApiProperty({
    description: 'User unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440001',
    format: 'uuid',
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    description: 'User full name',
    example: 'Ahmad Mohammad',
  })
  @IsString()
  fullName: string;

  @ApiProperty({
    description: 'User email address',
    example: 'ahmad@example.com',
    format: 'email',
  })
  @IsString()
  email: string;

  @ApiProperty({
    description: 'User role in the tenant',
    example: 'tenant_owner',
  })
  @IsString()
  role: string;

  @ApiProperty({
    description: 'Last login timestamp',
    example: '2025-01-16T08:30:00Z',
    format: 'date-time',
  })
  @IsDateString()
  lastLogin: string;
}

/**
 * Dashboard System Information DTO
 */
export class DashboardSystemInfoDto {
  @ApiProperty({
    description: 'System version',
    example: '1.0.0',
  })
  @IsString()
  version: string;

  @ApiProperty({
    description: 'Last system update timestamp',
    example: '2025-01-15T12:00:00Z',
    format: 'date-time',
  })
  @IsDateString()
  lastUpdate: string;

  @ApiProperty({
    description: 'Current service status',
    example: 'operational',
    enum: ['operational', 'maintenance'],
  })
  @IsIn(['operational', 'maintenance'])
  serviceStatus: string;
}

/**
 * Dashboard Data Container DTO
 */
export class DashboardDataDto {
  @ApiProperty({
    description: 'Tenant information',
    type: DashboardTenantDto,
  })
  tenant: DashboardTenantDto;

  @ApiProperty({
    description: 'User information',
    type: DashboardUserDto,
  })
  user: DashboardUserDto;

  @ApiProperty({
    description: 'System information',
    type: DashboardSystemInfoDto,
  })
  systemInfo: DashboardSystemInfoDto;
}
