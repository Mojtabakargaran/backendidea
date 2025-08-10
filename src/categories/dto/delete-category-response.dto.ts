import { ApiProperty } from '@nestjs/swagger';

export class DeleteCategoryResponseDto {
  @ApiProperty({
    description: 'Response message code',
    example: 'categories.CATEGORY_DELETED',
  })
  code: string;

  @ApiProperty({
    description: 'Response message text',
    example: 'Category deleted successfully',
  })
  message: string;
}
