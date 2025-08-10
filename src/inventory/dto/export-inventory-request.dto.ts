import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsArray, IsUUID, IsObject, IsBoolean, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ExportFormat, ExportType } from '../../common/enums';

export class ExportOptionsDto {
  @ApiProperty({
    description: 'Include item descriptions in export',
    example: true,
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeDescription?: boolean = true;

  @ApiProperty({
    description: 'Include audit history in export',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  includeAuditHistory?: boolean = false;

  @ApiProperty({
    description: 'Include status information in export',
    example: true,
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeStatusInfo?: boolean = true;

  @ApiProperty({
    description: 'Date range for historical data',
    required: false,
    type: 'object',
    properties: {
      startDate: { type: 'string', format: 'date' },
      endDate: { type: 'string', format: 'date' },
    },
  })
  @IsOptional()
  @IsObject()
  @Type(() => Object)
  dateRange?: {
    startDate: string;
    endDate: string;
  };
}

export class ExportInventoryRequestDto {
  @ApiProperty({
    description: 'Export file format',
    enum: ExportFormat,
    example: ExportFormat.PDF,
  })
  @IsEnum(ExportFormat)
  exportFormat: ExportFormat;

  @ApiProperty({
    description: 'Type of export operation',
    enum: ExportType,
    example: ExportType.MULTIPLE_ITEMS,
  })
  @IsEnum(ExportType)
  exportType: ExportType;

  @ApiProperty({
    description: 'Array of inventory item IDs to export (required for single_item and multiple_items)',
    type: [String],
    example: [
      '550e8400-e29b-41d4-a716-446655440000',
      '550e8400-e29b-41d4-a716-446655440001'
    ],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  itemIds?: string[];

  @ApiProperty({
    description: 'Export configuration options',
    type: ExportOptionsDto,
    required: false,
  })
  @IsOptional()
  @Type(() => ExportOptionsDto)
  exportOptions?: ExportOptionsDto;
}
