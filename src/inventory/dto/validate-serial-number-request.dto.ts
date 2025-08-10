import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class ValidateSerialNumberRequestDto {
  @ApiProperty({
    description: 'Serial number to validate for uniqueness',
    example: 'SN12345678',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  serialNumber: string;
}
