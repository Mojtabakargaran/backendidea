import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min, MaxLength } from 'class-validator';

export class UpdateQuantityRequestDto {
  @ApiProperty({
    description: 'New total quantity for the item',
    example: 50,
    minimum: 0,
  })
  @IsInt()
  @Min(0, { message: 'INVENTORY_QUANTITY_INVALID' })
  quantity: number;

  @ApiProperty({
    description: 'Unit of measurement for the quantity',
    example: 'pieces',
    maxLength: 50,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'QUANTITY_UNIT_TOO_LONG' })
  quantityUnit?: string;

  @ApiProperty({
    description: 'Reason for the quantity change',
    example: 'Stock adjustment - inventory count correction',
    maxLength: 500,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'CHANGE_REASON_TOO_LONG' })
  changeReason?: string;
}
