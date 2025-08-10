import { ApiProperty } from '@nestjs/swagger';
import { ExportFormat, ExportStatus } from '@/common/enums';

export class ExportAuditDataDto {
  @ApiProperty({
    description: 'Export ID for tracking',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  exportId: string;

  @ApiProperty({
    description: 'Export format',
    enum: ExportFormat,
    example: ExportFormat.CSV,
  })
  exportFormat: ExportFormat;

  @ApiProperty({
    description: 'Export status',
    enum: ExportStatus,
    example: ExportStatus.INITIATED,
  })
  status: ExportStatus;

  @ApiProperty({
    description: 'Estimated number of records to export',
    example: 150,
  })
  estimatedRecordCount: number;

  @ApiProperty({
    description: 'Filters applied to the export',
    example: {
      dateFrom: '2024-01-01T00:00:00.000Z',
      dateTo: '2024-12-31T23:59:59.999Z',
      action: 'user_created',
    },
  })
  filtersApplied: Record<string, any>;

  @ApiProperty({
    description: 'When the export will expire',
    format: 'date-time',
    example: '2024-01-22T10:30:00.000Z',
  })
  expiresAt: Date;

  @ApiProperty({
    description: 'Download URL (available when export is completed)',
    example: null,
    nullable: true,
  })
  downloadUrl?: string;
}

export class ExportAuditResponseDto {
  @ApiProperty({
    description: 'Success message code',
    example: 'audit.EXPORT_INITIATED',
  })
  code: string;

  @ApiProperty({
    description: 'Localized success message',
    example: 'Audit export initiated successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Export information',
    type: ExportAuditDataDto,
  })
  data: ExportAuditDataDto;
}
