import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsEnum, IsInt, Min, MaxLength } from 'class-validator';
import { InventoryItemStatus } from '../../common/enums';

export class UpdateInventoryItemRequestDto {
  @ApiProperty({
    description: 'Inventory item name',
    example: 'MacBook Pro 16-inch',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Inventory item description',
    example: 'High-performance laptop for development work',
    required: false,
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({
    description: 'Category ID for the inventory item',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsUUID()
  categoryId: string;

  @ApiProperty({
    description: 'Inventory item status',
    enum: InventoryItemStatus,
    example: InventoryItemStatus.ACTIVE,
  })
  @IsEnum(InventoryItemStatus)
  status: InventoryItemStatus;

  @ApiProperty({
    description: 'Version for optimistic locking',
    example: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  version: number;
}
