import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
  IsBoolean,
  Min,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ItemType } from '../../common/enums';

export class CreateInventoryItemRequestDto {
  @ApiProperty({
    description: 'Name of the inventory item',
    example: 'Industrial Drill',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Description of the inventory item',
    example: 'High-performance industrial drill for construction work',
    required: false,
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({
    description: 'UUID of the category this item belongs to',
    example: 'a1b2c3d4-e5f6-4g7h-8i9j-0k1l2m3n4o5p',
    format: 'uuid',
  })
  @IsUUID()
  categoryId: string;

  @ApiProperty({
    description: 'Type of inventory item',
    enum: ItemType,
    example: ItemType.SERIALIZED,
  })
  @IsEnum(ItemType)
  itemType: ItemType;

  @ApiProperty({
    description: 'Manual serial number for serialized items',
    example: 'SN12345678',
    required: false,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @ValidateIf((o) => o.itemType === ItemType.SERIALIZED)
  serialNumber?: string;

  @ApiProperty({
    description: 'Auto-generate serial number for serialized items',
    example: true,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @ValidateIf((o) => o.itemType === ItemType.SERIALIZED)
  autoGenerateSerial?: boolean;

  @ApiProperty({
    description: 'Initial quantity for non-serialized items',
    example: 10,
    required: false,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => Number(value))
  @ValidateIf((o) => o.itemType === ItemType.NON_SERIALIZED)
  quantity?: number;

  @ApiProperty({
    description: 'Unit of measurement for quantity',
    example: 'pieces',
    required: false,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @ValidateIf((o) => o.itemType === ItemType.NON_SERIALIZED)
  quantityUnit?: string;
}
