import { ApiProperty } from '@nestjs/swagger';
import { AvailabilityStatus } from '../../common/enums';

export class StatusTransitionOptionDto {
  @ApiProperty({
    description: 'Status option',
    enum: AvailabilityStatus,
    example: AvailabilityStatus.MAINTENANCE,
  })
  status: AvailabilityStatus;

  @ApiProperty({
    description: 'Display label for the status',
    example: 'Under Maintenance',
  })
  label: string;

  @ApiProperty({
    description: 'Whether this status requires a reason',
    example: true,
  })
  requiresReason: boolean;

  @ApiProperty({
    description: 'Whether this status requires a resolution date',
    example: true,
  })
  requiresResolutionDate: boolean;
}

export class StatusRestrictionDto {
  @ApiProperty({
    description: 'Restricted status',
    enum: AvailabilityStatus,
    example: AvailabilityStatus.RENTED,
  })
  status: AvailabilityStatus;

  @ApiProperty({
    description: 'Reason why this status is restricted',
    example: 'Item is currently rented out',
  })
  reason: string;
}

export class GetStatusOptionsDataDto {
  @ApiProperty({
    description: 'Current availability status',
    enum: AvailabilityStatus,
    example: AvailabilityStatus.AVAILABLE,
  })
  currentStatus: AvailabilityStatus;

  @ApiProperty({
    description: 'Valid status transition options',
    type: [StatusTransitionOptionDto],
  })
  validTransitions: StatusTransitionOptionDto[];

  @ApiProperty({
    description: 'Status options that are restricted',
    type: [StatusRestrictionDto],
  })
  restrictions: StatusRestrictionDto[];
}

export class GetStatusOptionsResponseDto {
  @ApiProperty({
    description: 'Response code',
    example: 'STATUS_OPTIONS_RETRIEVED',
  })
  code: string;

  @ApiProperty({
    description: 'Response message',
    example: 'Valid status options retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Response data',
    type: GetStatusOptionsDataDto,
  })
  data: GetStatusOptionsDataDto;
}
