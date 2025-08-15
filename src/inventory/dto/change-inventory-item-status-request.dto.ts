import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  IsDateString,
  ValidateIf,
} from 'class-validator';
import { AvailabilityStatus } from '../../common/enums';

export class ChangeInventoryItemStatusRequestDto {
  @ApiProperty({
    description: 'New availability status for the inventory item',
    enum: AvailabilityStatus,
    example: AvailabilityStatus.MAINTENANCE,
  })
  @IsEnum(AvailabilityStatus)
  newStatus: AvailabilityStatus;

  @ApiProperty({
    description: 'Reason for status change',
    example: 'Scheduled maintenance for cleaning and inspection',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  changeReason?: string;

  @ApiProperty({
    description: 'Expected resolution date for maintenance/damaged items',
    example: '2025-08-10T10:00:00Z',
    format: 'date-time',
    required: false,
  })
  @IsOptional()
  @ValidateIf(
    (o) => o.expectedResolutionDate !== '' && o.expectedResolutionDate != null,
  )
  @IsDateString(
    {},
    { message: 'expectedResolutionDate must be a valid ISO 8601 date string' },
  )
  expectedResolutionDate?: string;
}
