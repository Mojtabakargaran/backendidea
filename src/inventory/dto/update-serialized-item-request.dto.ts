import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsBoolean,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class UpdateSerializedItemRequestDto {
  @ApiProperty({
    description: 'New serial number for the item',
    example: 'SN-2024-001',
    maxLength: 100,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'SERIAL_NUMBER_TOO_LONG' })
  serialNumber?: string;

  @ApiProperty({
    description: 'Source of the serial number',
    enum: ['auto_generated', 'manual'],
    example: 'manual',
    required: false,
  })
  @IsOptional()
  @IsString()
  serialNumberSource?: 'auto_generated' | 'manual';

  @ApiProperty({
    description: 'Notes about item condition',
    example: 'Good condition, minor wear on corners',
    maxLength: 2000,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'CONDITION_NOTES_TOO_LONG' })
  conditionNotes?: string;

  @ApiProperty({
    description: 'Date of last maintenance performed',
    example: '2024-01-15T10:30:00Z',
    format: 'date-time',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  lastMaintenanceDate?: string;

  @ApiProperty({
    description: 'Date when next maintenance is due',
    example: '2024-07-15T10:30:00Z',
    format: 'date-time',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  nextMaintenanceDueDate?: string;

  @ApiProperty({
    description:
      'Confirmation for serial number change on item with rental history',
    example: false,
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  confirmSerialNumberChange?: boolean = false;
}
