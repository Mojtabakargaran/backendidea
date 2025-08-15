import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsUUID,
  IsOptional,
  IsString,
  IsBoolean,
  MaxLength,
  ArrayMinSize,
  IsEnum,
} from 'class-validator';
import { AvailabilityStatus, InventoryItemStatus } from '../../common/enums';

export class BulkEditOperationsDto {
  @ApiProperty({
    description: 'New category ID for all selected items',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({
    description: 'Text to append to maintenance notes of all selected items',
    example: 'Bulk update: Quarterly maintenance check completed',
    maxLength: 1000,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'CONDITION_NOTES_TOO_LONG' })
  appendMaintenanceNotes?: string;

  @ApiProperty({
    description: 'New status for all selected items',
    enum: InventoryItemStatus,
    example: 'active',
    required: false,
  })
  @IsOptional()
  @IsEnum(InventoryItemStatus)
  status?: InventoryItemStatus;

  @ApiProperty({
    description: 'New availability status for all selected items',
    enum: AvailabilityStatus,
    example: 'available',
    required: false,
  })
  @IsOptional()
  @IsEnum(AvailabilityStatus)
  availabilityStatus?: AvailabilityStatus;
}

export class BulkEditRequestDto {
  @ApiProperty({
    description: 'Array of item IDs to bulk edit',
    type: [String],
    example: [
      '550e8400-e29b-41d4-a716-446655440000',
      '550e8400-e29b-41d4-a716-446655440001',
    ],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'BULK_INVALID_ITEM_SELECTION' })
  @IsUUID(4, { each: true })
  itemIds: string[];

  @ApiProperty({
    description: 'Operations to perform on selected items',
    type: BulkEditOperationsDto,
  })
  operations: BulkEditOperationsDto;

  @ApiProperty({
    description: 'Confirmation for large operations (>100 items)',
    example: false,
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  confirmLargeOperation?: boolean = false;
}
