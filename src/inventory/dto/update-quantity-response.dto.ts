import { ApiProperty } from '@nestjs/swagger';

export class QuantityUpdateImpactDto {
  @ApiProperty({
    description: 'Change in available quantity (positive = increase, negative = decrease)',
    example: 15,
  })
  availabilityChange: number;

  @ApiProperty({
    description: 'Whether this is a significant reduction (>50% decrease)',
    example: false,
  })
  significantReduction: boolean;
}

export class UpdateQuantityDataDto {
  @ApiProperty({
    description: 'ID of the updated item',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  itemId: string;

  @ApiProperty({
    description: 'Previous total quantity',
    example: 35,
  })
  previousQuantity: number;

  @ApiProperty({
    description: 'New total quantity',
    example: 50,
  })
  newQuantity: number;

  @ApiProperty({
    description: 'Currently allocated quantity',
    example: 12,
  })
  allocatedQuantity: number;

  @ApiProperty({
    description: 'Available quantity after update (total - allocated)',
    example: 38,
  })
  availableQuantity: number;

  @ApiProperty({
    description: 'Unit of measurement',
    example: 'pieces',
    nullable: true,
  })
  quantityUnit: string | null;

  @ApiProperty({
    description: 'Reason for the quantity change',
    example: 'Stock adjustment - inventory count correction',
    nullable: true,
  })
  changeReason: string | null;

  @ApiProperty({
    description: 'Impact of the quantity change',
    type: QuantityUpdateImpactDto,
  })
  impact: QuantityUpdateImpactDto;
}

export class UpdateQuantityResponseDto {
  @ApiProperty({
    description: 'Response code indicating the result',
    example: 'QUANTITY_UPDATED',
    enum: ['QUANTITY_UPDATED'],
  })
  code: string;

  @ApiProperty({
    description: 'Human-readable message about the result',
    example: 'Item quantity updated successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Quantity update details',
    type: UpdateQuantityDataDto,
  })
  data: UpdateQuantityDataDto;
}
