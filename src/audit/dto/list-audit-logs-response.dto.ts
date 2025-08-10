import { ApiProperty } from '@nestjs/swagger';
import { AuditAction, AuditStatus } from '@/common/enums';

export class AuditActorDto {
  @ApiProperty({
    description: 'User ID who performed the action',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Full name of the user who performed the action',
    example: 'احمد محمدی',
  })
  fullName: string;

  @ApiProperty({
    description: 'Email of the user who performed the action',
    example: 'ahmad@company.com',
  })
  email: string;
}

export class AuditTargetDto {
  @ApiProperty({
    description: 'User ID who was affected by the action',
    format: 'uuid',
    example: '456e7890-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Full name of the user who was affected by the action',
    example: 'فاطمه احمدی',
  })
  fullName: string;

  @ApiProperty({
    description: 'Email of the user who was affected by the action',
    example: 'fateme@company.com',
  })
  email: string;
}

export class AuditLogDataDto {
  @ApiProperty({
    description: 'Audit log entry ID',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Tenant ID',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  tenantId: string;

  @ApiProperty({
    description: 'User ID who performed the action',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  actorUserId?: string;

  @ApiProperty({
    description: 'Information about the user who performed the action',
    type: AuditActorDto,
  })
  actor: AuditActorDto;

  @ApiProperty({
    description: 'User ID who was affected by the action',
    format: 'uuid',
    example: '456e7890-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  targetUserId?: string;

  @ApiProperty({
    description: 'Information about the user who was affected by the action',
    type: AuditTargetDto,
    nullable: true,
  })
  target?: AuditTargetDto;

  @ApiProperty({
    description: 'Type of action performed (translated)',
    example: 'User Created',
  })
  actionType: string;

  @ApiProperty({
    description: 'Raw action type for filtering',
    example: 'user_created',
  })
  rawActionType: string;

  @ApiProperty({
    description: 'Description of the action performed',
    example: 'User created with role: manager',
  })
  description: string;

  @ApiProperty({
    description: 'IP address from which the action was performed',
    example: '192.168.1.100',
  })
  ipAddress: string;

  @ApiProperty({
    description: 'User agent string of the client',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  })
  userAgent: string;

  @ApiProperty({
    description: 'Whether the action succeeded or failed',
    enum: AuditStatus,
    example: AuditStatus.SUCCESS,
  })
  status: AuditStatus;

  @ApiProperty({
    description: 'Additional metadata about the action',
    type: 'object',
    nullable: true,
  })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'When the action was performed',
    format: 'date-time',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;
}

export class PaginationInfoDto {
  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of items',
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 8,
  })
  totalPages: number;
}

export class AuditLogsDataDto {
  @ApiProperty({
    description: 'Array of audit log entries',
    type: [AuditLogDataDto],
  })
  auditLogs: AuditLogDataDto[];

  @ApiProperty({
    description: 'Pagination information',
    type: PaginationInfoDto,
  })
  pagination: PaginationInfoDto;
}

export class ListAuditLogsResponseDto {
  @ApiProperty({
    description: 'Success message code',
    example: 'audit.LOGS_RETRIEVED',
  })
  code: string;

  @ApiProperty({
    description: 'Localized success message',
    example: 'Audit logs retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Audit logs data and pagination information',
    type: AuditLogsDataDto,
  })
  data: AuditLogsDataDto;
}
