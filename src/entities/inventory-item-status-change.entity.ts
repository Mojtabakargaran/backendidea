import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { InventoryItem } from './inventory-item.entity';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';
import { AvailabilityStatus, StatusChangeType } from '../common/enums';

@Entity('inventory_item_status_changes')
@Index(['inventory_item_id', 'created_at'])
@Index(['tenant_id'])
@Index(['changed_by'])
export class InventoryItemStatusChange {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  inventory_item_id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  changed_by: string;

  @Column({ 
    type: 'enum', 
    enum: AvailabilityStatus,
    comment: 'Previous availability status'
  })
  previous_status: AvailabilityStatus;

  @Column({ 
    type: 'enum', 
    enum: AvailabilityStatus,
    comment: 'New availability status'
  })
  new_status: AvailabilityStatus;

  @Column({ 
    type: 'varchar', 
    length: 500, 
    nullable: true,
    comment: 'Reason for status change'
  })
  change_reason?: string;

  @Column({ 
    type: 'timestamptz', 
    nullable: true,
    comment: 'Expected resolution date for maintenance/damaged items'
  })
  expected_resolution_date?: Date;

  @Column({ 
    type: 'enum', 
    enum: StatusChangeType,
    default: StatusChangeType.MANUAL,
    comment: 'Type of status change (manual or automatic)'
  })
  change_type: StatusChangeType;

  @Column({ 
    type: 'varchar', 
    length: 45, 
    nullable: true,
    comment: 'IP address of the user making the change'
  })
  ip_address?: string;

  @Column({ 
    type: 'text', 
    nullable: true,
    comment: 'User agent string'
  })
  user_agent?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  // Relations
  @ManyToOne(() => InventoryItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inventory_item_id' })
  inventoryItem: InventoryItem;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'changed_by' })
  changedBy: User;
}
