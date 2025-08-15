import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  IsEnum,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  ItemType,
  AvailabilityStatus,
  InventoryItemStatus,
} from '../../common/enums';

export class ListInventoryItemsQueryDto {
  @ApiProperty({
    description: 'Page number for pagination',
    example: 1,
    required: false,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => Number(value) || 1)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    example: 25,
    required: false,
    minimum: 1,
    maximum: 100,
    default: 25,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => Number(value) || 25)
  limit?: number = 25;

  @ApiProperty({
    description: 'Search term for item names',
    example: 'drill',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Filter by category UUID',
    example: 'a1b2c3d4-e5f6-4g7h-8i9j-0k1l2m3n4o5p',
    required: false,
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({
    description: 'Filter by item type',
    enum: ItemType,
    example: ItemType.SERIALIZED,
    required: false,
  })
  @IsOptional()
  @IsEnum(ItemType)
  itemType?: ItemType;

  @ApiProperty({
    description: 'Filter by availability status',
    enum: AvailabilityStatus,
    example: AvailabilityStatus.AVAILABLE,
    required: false,
  })
  @IsOptional()
  @IsEnum(AvailabilityStatus)
  availabilityStatus?: AvailabilityStatus;

  @ApiProperty({
    description: 'Filter by inventory item status (active/inactive/archived)',
    enum: InventoryItemStatus,
    example: InventoryItemStatus.ACTIVE,
    required: false,
  })
  @IsOptional()
  @IsEnum(InventoryItemStatus)
  status?: InventoryItemStatus;

  @ApiProperty({
    description: 'Field to sort by',
    enum: ['name', 'createdAt', 'updatedAt'],
    example: 'createdAt',
    required: false,
    default: 'createdAt',
  })
  @IsOptional()
  @IsEnum(['name', 'createdAt', 'updatedAt'])
  sortBy?: 'name' | 'createdAt' | 'updatedAt' = 'createdAt';

  @ApiProperty({
    description: 'Sort direction',
    enum: ['asc', 'desc'],
    example: 'desc',
    required: false,
    default: 'desc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
