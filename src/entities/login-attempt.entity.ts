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
import { UserSession } from './user-session.entity';

/**
 * Login Attempt Entity
 * Tracks all login attempts for security monitoring and rate limiting
 * Implements BR11, BR12, BR15 from ? - User Login
 */
@Entity('login_attempts')
@Index(['ipAddress', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['email', 'createdAt'])
@Index(['status'])
export class LoginAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'user_id',
    type: 'uuid',
    nullable: true,
    comment: 'User ID if found during attempt',
  })
  userId?: string;

  @Column({
    type: 'varchar',
    length: 320,
    comment: 'Email address used in login attempt',
  })
  email: string;

  @Column({
    name: 'ip_address',
    type: 'varchar',
    length: 45,
    comment: 'IP address of login attempt',
  })
  ipAddress: string;

  @Column({
    name: 'user_agent',
    type: 'text',
    nullable: true,
    comment: 'Browser user agent string',
  })
  userAgent?: string;

  @Column({
    name: 'attempt_type',
    type: 'enum',
    enum: ['login', 'password_reset'],
    default: 'login',
    comment: 'Type of authentication attempt',
  })
  attemptType: string;

  @Column({
    type: 'enum',
    enum: [
      'success',
      'failed_invalid_credentials',
      'failed_account_locked',
      'failed_rate_limited',
      'failed_user_not_found',
    ],
    comment: 'Result of the login attempt',
  })
  status: string;

  @Column({
    name: 'failure_reason',
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Detailed reason for failed attempt',
  })
  failureReason?: string;

  @Column({
    name: 'tenant_context',
    type: 'uuid',
    nullable: true,
    comment: 'Tenant context if user found',
  })
  tenantContext?: string;

  @Column({
    name: 'session_created',
    type: 'uuid',
    nullable: true,
    comment: 'Session ID if login was successful',
  })
  sessionCreated?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relationships
  @ManyToOne(() => User, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => Tenant, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'tenant_context' })
  tenant?: Tenant;

  @ManyToOne(() => UserSession, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'session_created' })
  session?: UserSession;
}
