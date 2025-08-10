import { ApiProperty } from '@nestjs/swagger';
import { MessageKeys } from '../../common/message-keys';
import { InventoryItemDto } from './inventory-item.dto';

export class PaginationMeta {
  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 25,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of items',
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 6,
  })
  totalPages: number;

  @ApiProperty({
    description: 'Whether there is a next page',
    example: true,
  })
  hasNext: boolean;

  @ApiProperty({
    description: 'Whether there is a previous page',
    example: false,
  })
  hasPrevious: boolean;
}

export class ListInventoryItemsResponseDto {
  @ApiProperty({
    description: 'Response code indicating the result of the operation',
    example: MessageKeys.INVENTORY_LIST_RETRIEVED,
    enum: [MessageKeys.INVENTORY_LIST_RETRIEVED],
  })
  code: typeof MessageKeys.INVENTORY_LIST_RETRIEVED;

  @ApiProperty({
    description: 'Human-readable message in the requested language',
    example: 'Inventory items retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'List of inventory items',
    type: [InventoryItemDto],
  })
  data: InventoryItemDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMeta,
  })
  meta: PaginationMeta;
}
