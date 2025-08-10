import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { UserRole } from './user-role.entity';
import { UserSession } from './user-session.entity';
import { LoginAttempt } from './login-attempt.entity';
import { PermissionCheck } from './permission-check.entity';
import { RolePermission } from './role-permission.entity';
import { Language, Locale, TenantStatus } from '../common/enums';

/**
 * Tenant Entity
 * Represents tenant organizations created during registration
 * Each tenant is an isolated environment for a rental company
 */
@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_name', type: 'varchar', length: 200 })
  companyName: string;

  @Column({
    type: 'enum',
    enum: Language,
    comment: 'UI language selection - permanent setting for the tenant',
  })
  language: Language;

  @Column({
    type: 'enum',
    enum: Locale,
    comment: 'Regional locale selection - permanent setting for the tenant',
  })
  locale: Locale;

  @Column({
    type: 'enum',
    enum: TenantStatus,
    default: TenantStatus.ACTIVE,
  })
  status: TenantStatus;

  @Column({ name: 'subscription_plan', type: 'varchar', nullable: true })
  subscriptionPlan?: string;

  @Column({ name: 'max_users', type: 'int', default: 10 })
  maxUsers: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @OneToMany(() => User, (user) => user.tenant)
  users: User[];

  @OneToMany(() => UserRole, (userRole) => userRole.tenant)
  userRoles: UserRole[];

  @OneToMany(() => UserSession, (userSession) => userSession.tenant)
  userSessions: UserSession[];

  @OneToMany(() => LoginAttempt, (loginAttempt) => loginAttempt.tenant)
  loginAttempts: LoginAttempt[];

  @OneToMany(() => PermissionCheck, (permissionCheck) => permissionCheck.tenant)
  permissionChecks: PermissionCheck[];

  @OneToMany(() => RolePermission, (rolePermission) => rolePermission.tenant)
  rolePermissions: RolePermission[];
}
