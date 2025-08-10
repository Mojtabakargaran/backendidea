import { IsString, IsOptional, MaxLength, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCategoryRequestDto {
  @ApiProperty({
    description: 'Category name (required, maximum 255 characters)',
    maxLength: 255,
    example: 'Electronics & Gadgets',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiPropertyOptional({
    description: 'Category description (optional, maximum 500 characters)',
    maxLength: 500,
    nullable: true,
    example: 'Electronic devices, gadgets, and accessories',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => value?.trim() || null)
  description?: string | null;
}
