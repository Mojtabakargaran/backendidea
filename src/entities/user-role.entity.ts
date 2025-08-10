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
import { Role } from './role.entity';
import { Tenant } from './tenant.entity';

/**
 * UserRole Entity
 * Junction table linking users to roles within tenant context
 * Implements many-to-many relationship between users and roles with tenant isolation
 */
@Entity('user_roles')
@Index('UQ_user_roles_user_role_tenant', ['userId', 'roleId', 'tenantId'], {
  unique: true,
})
export class UserRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'role_id', type: 'uuid' })
  roleId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'assigned_by', type: 'uuid', nullable: true })
  assignedBy?: string;

  @Column({
    name: 'assigned_reason',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  assignedReason?: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relationships
  @ManyToOne(() => User, (user) => user.userRoles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Role, (role) => role.userRoles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @ManyToOne(() => Tenant, (tenant) => tenant.userRoles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => User, (user) => user.assignedRoles, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'assigned_by' })
  assignedByUser?: User;
}
