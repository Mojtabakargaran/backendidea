import { ApiProperty } from '@nestjs/swagger';
import { ItemType, AvailabilityStatus, InventoryItemStatus } from '../../common/enums';

export class InventoryItemDto {
  @ApiProperty({
    description: 'Unique identifier of the inventory item',
    example: 'a1b2c3d4-e5f6-4g7h-8i9j-0k1l2m3n4o5p',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Name of the inventory item',
    example: 'Industrial Drill',
  })
  name: string;

  @ApiProperty({
    description: 'Description of the inventory item',
    example: 'High-performance industrial drill for construction work',
    nullable: true,
  })
  description?: string;

  @ApiProperty({
    description: 'UUID of the category this item belongs to',
    example: 'b2c3d4e5-f6g7-4h8i-9j0k-1l2m3n4o5p6q',
    format: 'uuid',
  })
  categoryId: string;

  @ApiProperty({
    description: 'Name of the category this item belongs to',
    example: 'Power Tools',
  })
  categoryName: string;

  @ApiProperty({
    description: 'Type of inventory item',
    enum: ItemType,
    example: ItemType.SERIALIZED,
  })
  itemType: ItemType;

  @ApiProperty({
    description: 'Serial number for serialized items',
    example: 'SN12345678',
    nullable: true,
  })
  serialNumber?: string;

  @ApiProperty({
    description: 'Current quantity for non-serialized items',
    example: 10,
    nullable: true,
  })
  quantity?: number;

  @ApiProperty({
    description: 'Unit of measurement for quantity',
    example: 'pieces',
    nullable: true,
  })
  quantityUnit?: string;

  @ApiProperty({
    description: 'Current availability status of the item',
    enum: AvailabilityStatus,
    example: AvailabilityStatus.AVAILABLE,
  })
  availabilityStatus: AvailabilityStatus;

  @ApiProperty({
    description: 'Overall status of the inventory item',
    enum: InventoryItemStatus,
    example: InventoryItemStatus.ACTIVE,
  })
  status: InventoryItemStatus;

  @ApiProperty({
    description: 'Version for optimistic locking',
    example: 1,
  })
  version: number;

  @ApiProperty({
    description: 'Whether the item has rental history',
    example: false,
  })
  hasRentalHistory: boolean;

  @ApiProperty({
    description: 'Reason for last status change',
    example: 'Scheduled maintenance',
    nullable: true,
  })
  lastStatusChangeReason?: string;

  @ApiProperty({
    description: 'Expected resolution date for maintenance/damaged items',
    example: '2025-08-10T10:00:00Z',
    format: 'date-time',
    nullable: true,
  })
  expectedResolutionDate?: Date;

  @ApiProperty({
    description: 'Date and time when the item was created',
    example: '2024-01-15T10:30:00Z',
    format: 'date-time',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Date and time when the item was last updated',
    example: '2024-01-20T14:45:00Z',
    format: 'date-time',
  })
  updatedAt: Date;
}
