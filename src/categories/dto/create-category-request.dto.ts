import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCategoryRequestDto {
  @IsString()
  @IsNotEmpty({ message: 'validation.FIELD_REQUIRED' })
  @MaxLength(255, { message: 'validation.FIELD_TOO_LONG' })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'validation.FIELD_TOO_LONG' })
  description?: string;
}
