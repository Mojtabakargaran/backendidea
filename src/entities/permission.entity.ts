import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { PermissionAction } from '../common/enums';
import { RolePermission } from './role-permission.entity';
import { PermissionCheck } from './permission-check.entity';

/**
 * Permission Entity
 * Represents system permissions with resource/action combinations
 */
@Entity('permissions')
@Index(['resource', 'action'])
@Index(['isActive'])
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  resource: string;

  @Column({
    type: 'enum',
    enum: PermissionAction,
  })
  action: PermissionAction;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string;

  @Column({ type: 'boolean', default: true, name: 'is_system_permission' })
  isSystemPermission: boolean;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(
    () => RolePermission,
    (rolePermission) => rolePermission.permission,
  )
  rolePermissions: RolePermission[];

  @OneToMany(
    () => PermissionCheck,
    (permissionCheck) => permissionCheck.permission,
  )
  permissionChecks: PermissionCheck[];
}
