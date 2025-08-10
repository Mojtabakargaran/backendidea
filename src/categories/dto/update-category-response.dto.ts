import { ApiProperty } from '@nestjs/swagger';

export class UpdateCategoryResponseDto {
  @ApiProperty({
    description: 'Category unique identifier',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Updated category name',
    maxLength: 255,
    example: 'Electronics & Gadgets',
  })
  name: string;

  @ApiProperty({
    description: 'Updated category description',
    maxLength: 500,
    nullable: true,
    example: 'Electronic devices, gadgets, and accessories',
  })
  description: string | null;

  @ApiProperty({
    description: 'Number of associated inventory items',
    minimum: 0,
    example: 15,
  })
  itemsCount: number;

  @ApiProperty({
    description: 'Category creation date and time',
    format: 'date-time',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Category last modification date and time',
    format: 'date-time',
    example: '2024-01-20T14:45:00.000Z',
  })
  updatedAt: string;
}
