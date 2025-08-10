import { ApiProperty } from '@nestjs/swagger';
import { AvailabilityStatus } from '../../common/enums';

export class ChangeInventoryItemStatusDataDto {
  @ApiProperty({
    description: 'Inventory item ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  itemId: string;

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
    description: 'Status change record ID',
    example: '660f8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  changeId: string;

  @ApiProperty({
    description: 'Timestamp when the status was changed',
    example: '2025-08-04T14:30:00Z',
    format: 'date-time',
  })
  changedAt: string;
}

export class ChangeInventoryItemStatusResponseDto {
  @ApiProperty({
    description: 'Response code',
    example: 'STATUS_CHANGED',
  })
  code: string;

  @ApiProperty({
    description: 'Response message',
    example: 'Item status changed successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Response data',
    type: ChangeInventoryItemStatusDataDto,
  })
  data: ChangeInventoryItemStatusDataDto;
}
