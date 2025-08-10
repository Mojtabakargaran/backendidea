import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';
import { AuditAction, AuditStatus } from '../common/enums';

/**
 * AuditLog Entity
 * Tracks user actions and system events for audit trail
 */
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'actor_user_id', type: 'uuid', nullable: true })
  actorUserId?: string;

  @Column({ name: 'target_user_id', type: 'uuid', nullable: true })
  targetUserId?: string;

  @Column({
    type: 'enum',
    enum: AuditAction,
    comment: 'Type of action performed',
  })
  action: AuditAction;

  @Column({
    type: 'enum',
    enum: AuditStatus,
    comment: 'Whether the action succeeded or failed',
  })
  status: AuditStatus;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  details?: string;

  @Column({
    name: 'failure_reason',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  failureReason?: string;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress?: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relationships
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'actor_user_id' })
  actorUser?: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'target_user_id' })
  targetUser?: User;
}
