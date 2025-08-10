import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';
import { ExportFormat, ExportType, ExportStatus } from '../common/enums';

@Entity('inventory_exports')
@Index(['tenant_id', 'exported_by'])
@Index(['tenant_id', 'status'])
@Index(['expires_at'])
export class InventoryExport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  exported_by: string;

  @Column({ 
    type: 'enum', 
    enum: ExportFormat,
    comment: 'Format of the export file'
  })
  export_format: ExportFormat;

  @Column({ 
    type: 'enum', 
    enum: ExportType,
    comment: 'Type of export operation'
  })
  export_type: ExportType;

  @Column({ 
    type: 'jsonb', 
    nullable: true,
    comment: 'Array of inventory item IDs being exported'
  })
  item_ids?: string[];

  @Column({ 
    type: 'jsonb', 
    nullable: true,
    comment: 'Export configuration options'
  })
  export_options?: Record<string, any>;

  @Column({ 
    type: 'int',
    comment: 'Number of records in the export'
  })
  record_count: number;

  @Column({ 
    type: 'bigint', 
    nullable: true,
    comment: 'Size of the export file in bytes'
  })
  file_size_bytes?: number;

  @Column({ 
    type: 'varchar', 
    length: 500, 
    nullable: true,
    comment: 'Path to the generated export file'
  })
  file_path?: string;

  @Column({ 
    type: 'varchar', 
    length: 255, 
    nullable: true,
    comment: 'Hash of the export file for integrity verification'
  })
  file_hash?: string;

  @Column({ 
    type: 'varchar', 
    length: 45,
    comment: 'IP address of the user who initiated the export'
  })
  ip_address: string;

  @Column({ 
    type: 'text', 
    nullable: true,
    comment: 'User agent string from the export request'
  })
  user_agent?: string;

  @Column({ 
    type: 'enum', 
    enum: ExportStatus,
    default: ExportStatus.INITIATED,
    comment: 'Current status of the export operation'
  })
  status: ExportStatus;

  @Column({ 
    type: 'varchar', 
    length: 500, 
    nullable: true,
    comment: 'Reason for export failure, if applicable'
  })
  failure_reason?: string;

  @Column({ 
    type: 'int', 
    default: 0,
    comment: 'Number of times the export file has been downloaded'
  })
  download_count: number;

  @Column({ 
    type: 'timestamp', 
    nullable: true,
    comment: 'Timestamp of the last download'
  })
  last_downloaded_at?: Date;

  @Column({ 
    type: 'timestamp',
    comment: 'When the export file will expire and be deleted'
  })
  expires_at: Date;

  @CreateDateColumn({ 
    comment: 'Timestamp when the export was initiated'
  })
  created_at: Date;

  @Column({ 
    type: 'timestamp', 
    nullable: true,
    comment: 'Timestamp when the export was completed'
  })
  completed_at?: Date;

  // Relations
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exported_by' })
  exportedBy: User;
}
