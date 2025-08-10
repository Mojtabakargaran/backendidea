import { IsEnum, IsOptional, IsDateString, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ExportFormat, AuditAction, AuditStatus } from '@/common/enums';

export class ExportAuditRequestDto {
  @ApiProperty({
    description: 'Export file format',
    enum: ExportFormat,
    example: ExportFormat.CSV,
  })
  @IsEnum(ExportFormat)
  exportFormat: ExportFormat;

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
    description: 'Export logs from this date (ISO 8601 format)',
    format: 'date-time',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Export logs to this date (ISO 8601 format)',
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
}
