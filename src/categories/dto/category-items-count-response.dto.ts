import { ApiProperty } from '@nestjs/swagger';

export class CategoryItemsCountResponseDto {
  @ApiProperty({
    description: 'Response message code',
    example: 'categories.ITEMS_COUNT_RETRIEVED',
  })
  code: string;

  @ApiProperty({
    description: 'Response message text',
    example: 'Items count retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Category items count data',
    type: 'object',
    properties: {
      categoryId: {
        type: 'string',
        format: 'uuid',
        description: 'Category unique identifier',
        example: '550e8400-e29b-41d4-a716-446655440000',
      },
      itemsCount: {
        type: 'integer',
        minimum: 0,
        description: 'Number of associated inventory items',
        example: 0,
      },
      canDelete: {
        type: 'boolean',
        description: 'Whether the category can be safely deleted',
        example: true,
      },
    },
  })
  data: {
    categoryId: string;
    itemsCount: number;
    canDelete: boolean;
  };
}
