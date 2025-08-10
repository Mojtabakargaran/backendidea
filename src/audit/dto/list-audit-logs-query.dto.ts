import {
  IsOptional,
  IsString,
  IsUUID,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsIn,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AuditAction, AuditStatus } from '@/common/enums';

export class ListAuditLogsQueryDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    minimum: 1,
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of logs per page',
    minimum: 1,
    maximum: 100,
    default: 20,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Filter by specific user ID or username/email',
    example: '123e4567-e89b-12d3-a456-426614174000 or username or email@example.com',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter by audit action type',
    enum: AuditAction,
    example: AuditAction.USER_CREATED,
  })
  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @ApiPropertyOptional({
    description: 'Filter by audit status',
    enum: AuditStatus,
    example: AuditStatus.SUCCESS,
  })
  @IsOptional()
  @IsEnum(AuditStatus)
  status?: AuditStatus;

  @ApiPropertyOptional({
    description: 'Filter logs from this date (ISO 8601 format)',
    format: 'date-time',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter logs to this date (ISO 8601 format)',
    format: 'date-time',
    example: '2024-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Filter by IP address',
    example: '192.168.1.100',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  ipAddress?: string;

  @ApiPropertyOptional({
    description: 'Sort by field',
    enum: ['createdAt', 'actionType', 'status', 'actorUserId'],
    default: 'createdAt',
    example: 'createdAt',
  })
  @IsOptional()
  @IsIn(['createdAt', 'actionType', 'status', 'actorUserId'])
  sortBy?: 'createdAt' | 'actionType' | 'status' | 'actorUserId' = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'desc',
    example: 'desc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
