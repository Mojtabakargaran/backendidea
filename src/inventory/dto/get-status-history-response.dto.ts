import { ApiProperty } from '@nestjs/swagger';
import { AvailabilityStatus, StatusChangeType } from '../../common/enums';

export class StatusChangeUserDto {
  @ApiProperty({
    description: 'User ID who made the change',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Full name of the user who made the change',
    example: 'John Doe',
  })
  fullName: string;
}

export class StatusChangeHistoryDto {
  @ApiProperty({
    description: 'Status change record ID',
    example: '660f8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Previous availability status',
    enum: AvailabilityStatus,
    example: AvailabilityStatus.AVAILABLE,
  })
  previousStatus: AvailabilityStatus;

  @ApiProperty({
    description: 'New availability status',
    enum: AvailabilityStatus,
    example: AvailabilityStatus.MAINTENANCE,
  })
  newStatus: AvailabilityStatus;

  @ApiProperty({
    description: 'Reason for status change',
    example: 'Scheduled maintenance for cleaning and inspection',
    nullable: true,
  })
  changeReason?: string;

  @ApiProperty({
    description: 'Expected resolution date for maintenance/damaged items',
    example: '2025-08-10T10:00:00Z',
    format: 'date-time',
    nullable: true,
  })
  expectedResolutionDate?: string;

  @ApiProperty({
    description: 'Type of status change',
    enum: StatusChangeType,
    example: StatusChangeType.MANUAL,
  })
  changeType: StatusChangeType;

  @ApiProperty({
    description: 'User who made the change',
    type: StatusChangeUserDto,
  })
  changedBy: StatusChangeUserDto;

  @ApiProperty({
    description: 'Timestamp when the status was changed',
    example: '2025-08-04T14:30:00Z',
    format: 'date-time',
  })
  createdAt: string;
}

export class StatusHistoryPaginationDto {
  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  currentPage: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 5,
  })
  totalPages: number;

  @ApiProperty({
    description: 'Total number of items',
    example: 100,
  })
  totalItems: number;

  @ApiProperty({
    description: 'Items per page',
    example: 20,
  })
  itemsPerPage: number;

  @ApiProperty({
    description: 'Whether there is a next page',
    example: true,
  })
  hasNextPage: boolean;

  @ApiProperty({
    description: 'Whether there is a previous page',
    example: false,
  })
  hasPreviousPage: boolean;
}

export class GetStatusHistoryDataDto {
  @ApiProperty({
    description: 'List of status changes',
    type: [StatusChangeHistoryDto],
  })
  statusChanges: StatusChangeHistoryDto[];

  @ApiProperty({
    description: 'Pagination information',
    type: StatusHistoryPaginationDto,
  })
  pagination: StatusHistoryPaginationDto;
}

export class GetStatusHistoryResponseDto {
  @ApiProperty({
    description: 'Response code',
    example: 'STATUS_HISTORY_RETRIEVED',
  })
  code: string;

  @ApiProperty({
    description: 'Response message',
    example: 'Status history retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Response data',
    type: GetStatusHistoryDataDto,
  })
  data: GetStatusHistoryDataDto;
}
