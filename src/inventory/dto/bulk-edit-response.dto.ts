import { ApiProperty } from '@nestjs/swagger';

export class BulkEditChangeDto {
  @ApiProperty({
    description: 'Field that was changed',
    example: 'category',
  })
  field: string;

  @ApiProperty({
    description: 'Previous value',
    nullable: true,
    example: 'Electronics',
  })
  oldValue: string | null;

  @ApiProperty({
    description: 'New value',
    nullable: true,
    example: 'Furniture',
  })
  newValue: string | null;
}

export class BulkEditItemErrorDto {
  @ApiProperty({
    description: 'Field that caused the error',
    example: 'status',
  })
  field: string;

  @ApiProperty({
    description: 'Reason for the error',
    example: 'Cannot change status of item with active rental',
  })
  reason: string;
}

export class BulkEditItemResultDto {
  @ApiProperty({
    description: 'ID of the item',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  itemId: string;

  @ApiProperty({
    description: 'Result status for this item',
    enum: ['success', 'failed', 'partial'],
    example: 'success',
  })
  status: 'success' | 'failed' | 'partial';

  @ApiProperty({
    description: 'Changes made to this item',
    type: [BulkEditChangeDto],
  })
  changes: BulkEditChangeDto[];

  @ApiProperty({
    description: 'Errors encountered for this item',
    type: [BulkEditItemErrorDto],
  })
  errors: BulkEditItemErrorDto[];
}

export class BulkEditSummaryDto {
  @ApiProperty({
    description: 'Total number of items processed',
    example: 15,
  })
  totalItems: number;

  @ApiProperty({
    description: 'Number of items successfully updated',
    example: 12,
  })
  successfulItems: number;

  @ApiProperty({
    description: 'Number of items that failed',
    example: 2,
  })
  failedItems: number;

  @ApiProperty({
    description: 'Number of items partially updated',
    example: 1,
  })
  partiallySuccessful: number;
}

export class BulkEditSyncDataDto {
  @ApiProperty({
    description: 'Unique ID for this bulk operation',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  operationId: string;

  @ApiProperty({
    description: 'Summary of results',
    type: BulkEditSummaryDto,
  })
  summary: BulkEditSummaryDto;

  @ApiProperty({
    description: 'Detailed results for each item',
    type: [BulkEditItemResultDto],
  })
  results: BulkEditItemResultDto[];
}

export class BulkEditSyncResponseDto {
  @ApiProperty({
    description: 'Response code indicating the result',
    example: 'BULK_EDIT_COMPLETED',
    enum: ['BULK_EDIT_COMPLETED'],
  })
  code: string;

  @ApiProperty({
    description: 'Human-readable message about the result',
    example: 'Bulk edit operation completed',
  })
  message: string;

  @ApiProperty({
    description: 'Bulk edit operation results',
    type: BulkEditSyncDataDto,
  })
  data: BulkEditSyncDataDto;
}

export class BulkEditAsyncDataDto {
  @ApiProperty({
    description: 'Unique ID for this bulk operation',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  operationId: string;

  @ApiProperty({
    description: 'Total number of items to process',
    example: 150,
  })
  totalItems: number;

  @ApiProperty({
    description: 'Estimated completion time',
    format: 'date-time',
    example: '2024-01-15T10:45:00Z',
  })
  estimatedCompletion: string;

  @ApiProperty({
    description: 'URL to check operation status',
    example: '/api/inventory/bulk-operations/550e8400-e29b-41d4-a716-446655440000',
  })
  statusCheckUrl: string;
}

export class BulkEditAsyncResponseDto {
  @ApiProperty({
    description: 'Response code indicating the result',
    example: 'BULK_EDIT_INITIATED',
    enum: ['BULK_EDIT_INITIATED'],
  })
  code: string;

  @ApiProperty({
    description: 'Human-readable message about the result',
    example: 'Large bulk edit operation initiated asynchronously',
  })
  message: string;

  @ApiProperty({
    description: 'Bulk edit operation initiation details',
    type: BulkEditAsyncDataDto,
  })
  data: BulkEditAsyncDataDto;
}
