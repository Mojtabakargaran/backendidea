import { ApiProperty } from '@nestjs/swagger';
import { MessageKeys } from '../../common/message-keys';
import { InventoryItemDto } from './inventory-item.dto';

export class GetInventoryItemResponseDto {
  @ApiProperty({
    description: 'Response code indicating the result of the operation',
    example: MessageKeys.INVENTORY_ITEM_RETRIEVED,
    enum: [MessageKeys.INVENTORY_ITEM_RETRIEVED],
  })
  code: typeof MessageKeys.INVENTORY_ITEM_RETRIEVED;

  @ApiProperty({
    description: 'Human-readable message in the requested language',
    example: 'Inventory item retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Details of the inventory item',
    type: InventoryItemDto,
  })
  data: InventoryItemDto;
}
