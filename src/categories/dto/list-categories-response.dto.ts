import { ApiProperty } from '@nestjs/swagger';

export class CategoryListItemDto {
  @ApiProperty({
    description: 'Category unique identifier',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Category name',
    maxLength: 255,
    example: 'Electronics',
  })
  name: string;

  @ApiProperty({
    description: 'Category description',
    maxLength: 500,
    nullable: true,
    example: 'Electronic devices and accessories',
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

export class PaginationDto {
  @ApiProperty({
    description: 'Current page number',
    minimum: 1,
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 50,
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of categories',
    minimum: 0,
    example: 45,
  })
  total: number;

  @ApiProperty({
    description: 'Total number of pages',
    minimum: 0,
    example: 3,
  })
  totalPages: number;
}

export class ListCategoriesResponseDto {
  @ApiProperty({
    description: 'List of categories',
    type: [CategoryListItemDto],
  })
  categories: CategoryListItemDto[];

  @ApiProperty({
    description: 'Pagination information',
    type: PaginationDto,
  })
  pagination: PaginationDto;
}
