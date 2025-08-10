import { ApiProperty } from '@nestjs/swagger';
import { MessageKeys } from '../../common/message-keys';
import { InventoryItemDto } from './inventory-item.dto';

export class CreateInventoryItemResponseDto {
  @ApiProperty({
    description: 'Response code indicating the result of the operation',
    example: MessageKeys.INVENTORY_ITEM_CREATED,
    enum: [MessageKeys.INVENTORY_ITEM_CREATED],
  })
  code: typeof MessageKeys.INVENTORY_ITEM_CREATED;

  @ApiProperty({
    description: 'Human-readable message in the requested language',
    example: 'Inventory item created successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Details of the created inventory item',
    type: InventoryItemDto,
  })
  data: InventoryItemDto;
}
