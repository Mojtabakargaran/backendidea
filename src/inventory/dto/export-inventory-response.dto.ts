import { ApiProperty } from '@nestjs/swagger';
import { ExportStatus } from '../../common/enums';
import { MessageKeys } from '../../common/message-keys';

export class ExportInventoryDataDto {
  @ApiProperty({
    description: 'Unique identifier for the export operation',
    example: '550e8400-e29b-41d4-a716-446655440003',
    format: 'uuid',
  })
  exportId: string;

  @ApiProperty({
    description: 'Current status of the export operation',
    enum: ExportStatus,
    example: ExportStatus.INITIATED,
  })
  status: ExportStatus;

  @ApiProperty({
    description: 'Number of items being exported',
    example: 2,
  })
  recordCount: number;

  @ApiProperty({
    description: 'Download URL for completed exports',
    example: null,
    nullable: true,
  })
  downloadUrl?: string;

  @ApiProperty({
    description: 'When the export file will be automatically deleted',
    example: '2025-08-05T10:30:00.000Z',
    format: 'date-time',
  })
  expiresAt: string;

  @ApiProperty({
    description: 'Estimated completion time for large exports',
    example: '2025-08-04T10:32:00.000Z',
    format: 'date-time',
  })
  estimatedCompletionTime: string;
}

export class ExportInventoryResponseDto {
  @ApiProperty({
    description: 'Response code indicating the result of the operation',
    example: MessageKeys.EXPORT_INITIATED,
    enum: [MessageKeys.EXPORT_INITIATED],
  })
  code: typeof MessageKeys.EXPORT_INITIATED;

  @ApiProperty({
    description: 'Human-readable message in the requested language',
    example: 'Export initiated successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Export operation details',
    type: ExportInventoryDataDto,
  })
  data: ExportInventoryDataDto;
}
