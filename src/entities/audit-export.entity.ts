import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';
import { ExportStatus, ExportFormat } from '../common/enums';

/**
 * AuditExport Entity
 * Tracks audit trail export requests for compliance reporting
 */
@Entity('audit_exports')
export class AuditExport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'exported_by', type: 'uuid' })
  exportedBy: string;

  @Column({
    name: 'export_format',
    type: 'enum',
    enum: ExportFormat,
    comment: 'Format of the export file',
  })
  exportFormat: ExportFormat;

  @Column({
    type: 'enum',
    enum: ExportStatus,
    default: ExportStatus.INITIATED,
    comment: 'Current status of the export',
  })
  status: ExportStatus;

  @Column({ name: 'filters_applied', type: 'jsonb', nullable: true })
  filtersApplied?: Record<string, any>;

  @Column({ name: 'date_range_start', type: 'timestamp', nullable: true })
  dateRangeStart?: Date;

  @Column({ name: 'date_range_end', type: 'timestamp', nullable: true })
  dateRangeEnd?: Date;

  @Column({ name: 'record_count', type: 'int', nullable: true })
  recordCount?: number;

  @Column({ name: 'file_path', type: 'varchar', length: 500, nullable: true })
  filePath?: string;

  @Column({ name: 'file_size', type: 'bigint', nullable: true })
  fileSize?: number;

  @Column({ name: 'file_hash', type: 'varchar', length: 128, nullable: true })
  fileHash?: string;

  @Column({
    name: 'download_url',
    type: 'varchar',
    length: 1000,
    nullable: true,
  })
  downloadUrl?: string;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @Column({
    name: 'failure_reason',
    type: 'varchar',
    length: 1000,
    nullable: true,
  })
  failureReason?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt?: Date;

  // Relationships
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exported_by' })
  exportedByUser: User;
}
