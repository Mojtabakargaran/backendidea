import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Tenant } from './tenant.entity';

/**
 * User Session Entity
 * Represents active user sessions with tenant context
 * Implements session management for ? - User Login
 */
@Entity('user_sessions')
@Index(['userId'])
@Index(['sessionToken'])
@Index(['status'])
@Index(['expiresAt'])
export class UserSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({
    name: 'session_token',
    type: 'varchar',
    length: 255,
    unique: true,
    comment: 'Unique session identifier',
  })
  sessionToken: string;

  @Column({
    name: 'csrf_token',
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'CSRF protection token',
  })
  csrfToken?: string;

  @Column({
    name: 'ip_address',
    type: 'varchar',
    length: 45,
    comment: 'IP address where session was created',
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
    name: 'device_fingerprint',
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Device fingerprint for security tracking',
  })
  deviceFingerprint?: string;

  @Column({
    type: 'enum',
    enum: ['active', 'expired', 'invalidated', 'logged_out'],
    default: 'active',
    comment: 'Session status',
  })
  status: string;

  @Column({
    name: 'last_activity_at',
    type: 'timestamp',
    comment: 'Last user activity timestamp for timeout calculation',
  })
  lastActivityAt: Date;

  @Column({
    name: 'expires_at',
    type: 'timestamp',
    comment: 'Session expiration time (8 hours from creation)',
  })
  expiresAt: Date;

  @Column({
    name: 'login_method',
    type: 'enum',
    enum: ['email_password', 'password_reset'],
    default: 'email_password',
    comment: 'Method used to create session',
  })
  loginMethod: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Tenant, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;
}
