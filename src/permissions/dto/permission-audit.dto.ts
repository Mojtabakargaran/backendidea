import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsUUID,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PermissionAction, CheckResult } from '../../common/enums';

export class PermissionAuditQuery {
  @ApiProperty({
    description: 'Page number for pagination',
    example: 1,
    required: false,
    default: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of records per page',
    example: 20,
    required: false,
    default: 20,
    maximum: 100,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({
    description: 'Filter by user ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({
    description: 'Filter by permission ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  permissionId?: string;

  @ApiProperty({
    description: 'Filter by check result',
    enum: CheckResult,
    required: false,
  })
  @IsOptional()
  @IsEnum(CheckResult)
  checkResult?: CheckResult;

  @ApiProperty({
    description: 'Filter by date from (ISO date-time)',
    example: '2024-01-01T00:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiProperty({
    description: 'Filter by date to (ISO date-time)',
    example: '2024-12-31T23:59:59.999Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

export class PermissionAuditLogDto {
  @ApiProperty({
    description: 'Audit log ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'User ID who performed the action',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId: string;

  @ApiProperty({
    description: 'Full name of the user',
    example: 'John Doe',
  })
  userFullName: string;

  @ApiProperty({
    description: 'Permission name that was checked',
    example: 'users:create',
  })
  permissionName: string;

  @ApiProperty({
    description: 'Resource that the permission applies to',
    example: 'users',
  })
  resource: string;

  @ApiProperty({
    description: 'Action that was attempted',
    enum: PermissionAction,
    example: PermissionAction.CREATE,
  })
  action: PermissionAction;

  @ApiProperty({
    description: 'Result of the permission check',
    enum: CheckResult,
    example: CheckResult.GRANTED,
  })
  checkResult: CheckResult;

  @ApiProperty({
    description: 'Reason for denial if permission was denied',
    example: 'Insufficient role privileges',
    required: false,
  })
  denialReason?: string;

  @ApiProperty({
    description: 'Resource context for the permission check',
    example: 'userId:123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  resourceContext?: string;

  @ApiProperty({
    description: 'IP address of the request',
    example: '192.168.1.100',
    required: false,
  })
  ipAddress?: string;

  @ApiProperty({
    description: 'Timestamp when the check was performed',
    example: '2024-01-15T14:30:00.000Z',
  })
  createdAt: string;
}

export class PermissionAuditPagination {
  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of records per page',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of records',
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 8,
  })
  totalPages: number;
}

export class PermissionAuditData {
  @ApiProperty({
    description: 'List of permission audit logs',
    type: [PermissionAuditLogDto],
  })
  logs: PermissionAuditLogDto[];

  @ApiProperty({
    description: 'Pagination information',
    type: PermissionAuditPagination,
  })
  pagination: PermissionAuditPagination;
}

export class PermissionAuditResponse {
  @ApiProperty({
    description: 'Response code',
    example: 'permissions.PERMISSION_AUDIT_RETRIEVED',
  })
  code: string;

  @ApiProperty({
    description: 'Localized response message',
    example: 'Permission audit logs retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Permission audit data',
    type: PermissionAuditData,
  })
  data: PermissionAuditData;
}
