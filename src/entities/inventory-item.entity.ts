import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Check,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { Category } from './category.entity';
import {
  ItemType,
  AvailabilityStatus,
  InventoryItemStatus,
} from '../common/enums';

@Entity('inventory_items')
@Index(['tenant_id', 'name'], { unique: true })
@Index(['tenant_id', 'serial_number'], {
  unique: true,
  where: 'serial_number IS NOT NULL',
})
@Check(
  `(item_type = 'serialized' AND serial_number IS NOT NULL) OR (item_type = 'non_serialized' AND quantity IS NOT NULL)`,
)
export class InventoryItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  category_id: string;

  @Column({
    type: 'enum',
    enum: ItemType,
    comment: 'Type of inventory item: serialized or non-serialized',
  })
  item_type: ItemType;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Serial number for serialized items',
  })
  serial_number?: string;

  @Column({
    type: 'enum',
    enum: ['auto_generated', 'manual'],
    nullable: true,
    comment: 'Source of serial number generation',
  })
  serial_number_source?: 'auto_generated' | 'manual';

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Previous serial number for tracking changes',
  })
  previous_serial_number?: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Notes about item condition',
  })
  condition_notes?: string;

  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'Date of last maintenance performed',
  })
  last_maintenance_date?: Date;

  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'Date when next maintenance is due',
  })
  next_maintenance_due_date?: Date;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    comment: 'Quantity for non-serialized items',
  })
  quantity?: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: 'Currently allocated quantity',
  })
  allocated_quantity: number;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'Unit of measurement for quantity (e.g., pieces, sets, boxes)',
  })
  quantity_unit?: string;

  @Column({
    type: 'enum',
    enum: AvailabilityStatus,
    default: AvailabilityStatus.AVAILABLE,
    comment: 'Current availability status of the item',
  })
  availability_status: AvailabilityStatus;

  @Column({
    type: 'enum',
    enum: InventoryItemStatus,
    default: InventoryItemStatus.ACTIVE,
    comment: 'Overall status of the inventory item',
  })
  status: InventoryItemStatus;

  @Column({
    type: 'int',
    default: 1,
    comment: 'Version for optimistic locking',
  })
  version: number;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether the item has rental history',
  })
  has_rental_history: boolean;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Reason for last status change',
  })
  last_status_change_reason?: string;

  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'Expected resolution date for maintenance/damaged items',
  })
  expected_resolution_date?: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  // Relations
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => Category, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category: Category;
}
