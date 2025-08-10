import { ApiProperty } from '@nestjs/swagger';
import { InventoryItemDto } from './inventory-item.dto';

export class ItemChangeDto {
  @ApiProperty({
    description: 'Field that was changed',
    example: 'name',
  })
  field: string;

  @ApiProperty({
    description: 'Previous value',
    example: 'Old MacBook Pro',
    nullable: true,
  })
  oldValue?: string;

  @ApiProperty({
    description: 'New value',
    example: 'MacBook Pro 16-inch',
    nullable: true,
  })
  newValue?: string;
}

export class UpdateInventoryItemDataDto {
  @ApiProperty({
    description: 'Updated inventory item',
    type: InventoryItemDto,
  })
  item: InventoryItemDto;

  @ApiProperty({
    description: 'List of changes made',
    type: [ItemChangeDto],
  })
  changes: ItemChangeDto[];
}

export class UpdateInventoryItemResponseDto {
  @ApiProperty({
    description: 'Response code',
    example: 'ITEM_UPDATED',
  })
  code: string;

  @ApiProperty({
    description: 'Response message',
    example: 'Inventory item updated successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Response data',
    type: UpdateInventoryItemDataDto,
  })
  data: UpdateInventoryItemDataDto;
}
