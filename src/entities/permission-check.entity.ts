import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Tenant } from './tenant.entity';
import { Permission } from './permission.entity';
import { CheckResult } from '../common/enums';

/**
 * PermissionCheck Entity
 * Logs permission validation attempts for audit purposes
 */
@Entity('permission_checks')
@Index('idx_permission_checks_user_tenant_created_at', [
  'userId',
  'tenantId',
  'createdAt',
])
@Index(['permissionId'])
@Index(['checkResult'])
@Index(['createdAt'])
export class PermissionCheck {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @Column({ type: 'uuid', name: 'permission_id' })
  permissionId: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    name: 'resource_context',
  })
  resourceContext?: string;

  @Column({
    type: 'enum',
    enum: CheckResult,
    name: 'check_result',
  })
  checkResult: CheckResult;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    name: 'denial_reason',
  })
  denialReason?: string;

  @Column({ type: 'varchar', length: 45, nullable: true, name: 'ip_address' })
  ipAddress?: string;

  @Column({ type: 'text', nullable: true, name: 'user_agent' })
  userAgent?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.permissionChecks)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Tenant, (tenant) => tenant.permissionChecks)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => Permission, (permission) => permission.permissionChecks)
  @JoinColumn({ name: 'permission_id' })
  permission: Permission;
}
