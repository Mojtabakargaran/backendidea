import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';

export enum BulkOperationType {
  UPDATE_CATEGORY = 'update_category',
  UPDATE_STATUS = 'update_status',
  UPDATE_AVAILABILITY = 'update_availability',
  UPDATE_MAINTENANCE = 'update_maintenance',
  UPDATE_QUANTITY = 'update_quantity',
}

export enum BulkOperationStatus {
  INITIATED = 'initiated',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PARTIALLY_COMPLETED = 'partially_completed',
}

@Entity('inventory_bulk_operations')
@Index(['tenant_id', 'initiated_by'])
@Index(['tenant_id', 'status'])
export class InventoryBulkOperation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  initiated_by: string;

  @Column({
    type: 'enum',
    enum: BulkOperationType,
    comment: 'Type of bulk operation being performed',
  })
  operation_type: BulkOperationType;

  @Column({
    type: 'jsonb',
    comment: 'Array of target item IDs for the operation',
  })
  target_item_ids: string[];

  @Column({
    type: 'jsonb',
    comment: 'Parameters for the bulk operation',
  })
  operation_parameters: Record<string, any>;

  @Column({
    type: 'enum',
    enum: BulkOperationStatus,
    default: BulkOperationStatus.INITIATED,
    comment: 'Current status of the bulk operation',
  })
  status: BulkOperationStatus;

  @Column({
    type: 'int',
    comment: 'Total number of items to process',
  })
  total_items: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of successfully processed items',
  })
  successful_items: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of items that failed processing',
  })
  failed_items: number;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Details about failed items and reasons',
  })
  failure_details?: Record<string, any>;

  @Column({
    type: 'varchar',
    length: 45,
    comment: 'IP address of the user who initiated the operation',
  })
  ip_address: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'User agent of the client who initiated the operation',
  })
  user_agent?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'Timestamp when the operation was completed',
  })
  completed_at?: Date;

  // Relations
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'initiated_by' })
  initiator: User;
}
