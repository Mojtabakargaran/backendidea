import { ApiProperty } from '@nestjs/swagger';

export class BulkOperationSummaryDto {
  @ApiProperty({
    description: 'Number of items successfully processed',
    example: 70,
  })
  successfulItems: number;

  @ApiProperty({
    description: 'Number of items that failed processing',
    example: 5,
  })
  failedItems: number;

  @ApiProperty({
    description: 'Number of items partially processed',
    example: 2,
  })
  partiallySuccessful: number;
}

export class BulkOperationProgressDto {
  @ApiProperty({
    description: 'Total number of items to process',
    example: 150,
  })
  totalItems: number;

  @ApiProperty({
    description: 'Number of items processed so far',
    example: 75,
  })
  processedItems: number;

  @ApiProperty({
    description: 'Number of items successfully processed',
    example: 70,
  })
  successfulItems: number;

  @ApiProperty({
    description: 'Number of items that failed processing',
    example: 5,
  })
  failedItems: number;

  @ApiProperty({
    description: 'Percentage of completion (0-100)',
    example: 50.0,
  })
  percentComplete: number;
}

export class BulkOperationFailureDetailDto {
  @ApiProperty({
    description: 'ID of the item that failed',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  itemId: string;

  @ApiProperty({
    description: 'Reason for failure',
    example: 'Item not found or permission denied',
  })
  reason: string;
}

export class BulkOperationResultsDto {
  @ApiProperty({
    description: 'Summary of operation results',
    type: BulkOperationSummaryDto,
  })
  summary: BulkOperationSummaryDto;

  @ApiProperty({
    description: 'Details about failed items',
    type: [BulkOperationFailureDetailDto],
  })
  failureDetails: BulkOperationFailureDetailDto[];
}

export class BulkOperationStatusDataDto {
  @ApiProperty({
    description: 'Unique ID of the bulk operation',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  operationId: string;

  @ApiProperty({
    description: 'Type of bulk operation',
    enum: [
      'update_category',
      'update_status',
      'update_availability',
      'update_maintenance',
      'update_quantity',
    ],
    example: 'update_category',
  })
  operationType: string;

  @ApiProperty({
    description: 'Current status of the operation',
    enum: [
      'initiated',
      'processing',
      'completed',
      'failed',
      'partially_completed',
    ],
    example: 'processing',
  })
  status: string;

  @ApiProperty({
    description: 'Progress information',
    type: BulkOperationProgressDto,
  })
  progress: BulkOperationProgressDto;

  @ApiProperty({
    description:
      'Operation results (populated when status is completed/failed)',
    type: BulkOperationResultsDto,
  })
  results: BulkOperationResultsDto;

  @ApiProperty({
    description: 'When the operation was initiated',
    format: 'date-time',
    example: '2024-01-15T10:30:00Z',
  })
  initiatedAt: string;

  @ApiProperty({
    description: 'When the operation was completed',
    format: 'date-time',
    example: '2024-01-15T10:45:00Z',
    nullable: true,
  })
  completedAt: string | null;
}

export class BulkOperationStatusResponseDto {
  @ApiProperty({
    description: 'Response code indicating the result',
    example: 'BULK_OPERATION_STATUS',
    enum: ['BULK_OPERATION_STATUS'],
  })
  code: string;

  @ApiProperty({
    description: 'Human-readable message about the result',
    example: 'Bulk operation status retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Bulk operation status details',
    type: BulkOperationStatusDataDto,
  })
  data: BulkOperationStatusDataDto;
}
