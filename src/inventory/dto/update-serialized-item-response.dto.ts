import { ApiProperty } from '@nestjs/swagger';
import { InventoryItemDto } from './inventory-item.dto';

export class SerializedItemChangeDto {
  @ApiProperty({
    description: 'Field that was changed',
    example: 'serialNumber',
  })
  field: string;

  @ApiProperty({
    description: 'Previous value of the field',
    example: 'SN-2023-999',
    nullable: true,
  })
  oldValue: string | null;

  @ApiProperty({
    description: 'New value of the field',
    example: 'SN-2024-001',
    nullable: true,
  })
  newValue: string | null;
}

export class UpdateSerializedItemDataDto {
  @ApiProperty({
    description: 'Updated inventory item data',
    type: InventoryItemDto,
  })
  item: InventoryItemDto;

  @ApiProperty({
    description: 'List of changes made to the item',
    type: [SerializedItemChangeDto],
  })
  changes: SerializedItemChangeDto[];

  @ApiProperty({
    description: 'Whether the serial number was changed',
    example: true,
  })
  serialNumberChanged: boolean;

  @ApiProperty({
    description:
      'Whether historical link was maintained for serial number change',
    example: true,
  })
  historicalLinkMaintained: boolean;
}

export class UpdateSerializedItemResponseDto {
  @ApiProperty({
    description: 'Response code indicating the result',
    example: 'SERIALIZED_ITEM_UPDATED',
    enum: ['SERIALIZED_ITEM_UPDATED'],
  })
  code: string;

  @ApiProperty({
    description: 'Human-readable message about the result',
    example: 'Serialized item updated successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Updated item data and change details',
    type: UpdateSerializedItemDataDto,
  })
  data: UpdateSerializedItemDataDto;
}
