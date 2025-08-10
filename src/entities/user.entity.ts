import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { UserRole } from './user-role.entity';
import { EmailVerification } from './email-verification.entity';
import { UserSession } from './user-session.entity';
import { LoginAttempt } from './login-attempt.entity';
import { PasswordResetToken } from './password-reset-token.entity';
import { PermissionCheck } from './permission-check.entity';
import { UserStatus } from '../common/enums';

/**
 * User Entity
 * Represents user accounts linked to tenants
 * Each user belongs to exactly one tenant
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'full_name', type: 'varchar', length: 100 })
  fullName: string;

  @Column({
    type: 'varchar',
    length: 320,
    unique: true,
    comment: 'Email addresses must be unique across the entire platform (BR01)',
  })
  email: string;

  @Column({
    name: 'phone_number',
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: 'User phone number in international format',
  })
  phoneNumber?: string;

  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 255,
    comment: 'Password hashed using bcrypt with minimum 12 rounds',
  })
  passwordHash: string;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING_VERIFICATION,
  })
  status: UserStatus;

  @Column({ name: 'email_verified_at', type: 'timestamp', nullable: true })
  emailVerifiedAt?: Date;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt?: Date;

  @Column({
    name: 'last_login_ip',
    type: 'varchar',
    length: 45,
    nullable: true,
  })
  lastLoginIp?: string;

  @Column({ name: 'login_attempts', type: 'int', default: 0 })
  loginAttempts: number;

  @Column({ name: 'locked_until', type: 'timestamp', nullable: true })
  lockedUntil?: Date;

  @Column({ name: 'lock_reason', type: 'varchar', length: 500, nullable: true })
  lockReason?: string;

  @Column({ name: 'password_changed_at', type: 'timestamp', nullable: true })
  passwordChangedAt?: Date;

  @Column({ name: 'password_reset_required', type: 'boolean', default: false })
  passwordResetRequired: boolean;

  @Column({ name: 'password_reset_count', type: 'int', default: 0 })
  passwordResetCount: number;

  @Column({ name: 'last_password_reset_at', type: 'timestamp', nullable: true })
  lastPasswordResetAt?: Date;

  @Column({ name: 'security_questions_set', type: 'boolean', default: false })
  securityQuestionsSet: boolean;

  @Column({ name: 'two_factor_enabled', type: 'boolean', default: false })
  twoFactorEnabled: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Tenant, (tenant) => tenant.users, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @OneToMany(() => UserRole, (userRole) => userRole.user)
  userRoles: UserRole[];

  @OneToMany(() => UserRole, (userRole) => userRole.assignedByUser, {
    nullable: true,
  })
  assignedRoles: UserRole[];

  @OneToMany(
    () => EmailVerification,
    (emailVerification) => emailVerification.user,
  )
  emailVerifications: EmailVerification[];

  @OneToMany(() => UserSession, (userSession) => userSession.user)
  userSessions: UserSession[];

  @OneToMany(() => LoginAttempt, (loginAttempt) => loginAttempt.user)
  loginAttemptRecords: LoginAttempt[];

  @OneToMany(
    () => PasswordResetToken,
    (passwordResetToken) => passwordResetToken.user,
  )
  passwordResetTokens: PasswordResetToken[];

  @OneToMany(() => PermissionCheck, (permissionCheck) => permissionCheck.user)
  permissionChecks: PermissionCheck[];
}
