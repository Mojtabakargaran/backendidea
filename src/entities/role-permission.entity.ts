import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Role } from './role.entity';
import { Permission } from './permission.entity';
import { Tenant } from './tenant.entity';

/**
 * RolePermission Entity
 * Links roles to permissions with grant/deny status within tenant context
 */
@Entity('role_permissions')
@Index(['roleId'])
@Index(['permissionId'])
@Index(['tenantId'])
export class RolePermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'role_id' })
  roleId: string;

  @Column({ type: 'uuid', name: 'permission_id' })
  permissionId: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @Column({ type: 'boolean', default: true, name: 'is_granted' })
  isGranted: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => Role, (role) => role.rolePermissions)
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @ManyToOne(() => Permission, (permission) => permission.rolePermissions)
  @JoinColumn({ name: 'permission_id' })
  permission: Permission;

  @ManyToOne(() => Tenant, (tenant) => tenant.rolePermissions)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;
}
