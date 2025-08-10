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

/**
 * Password Reset Token Entity
 * Manages password reset tokens for ? and ?
 * Implements BR16, BR17, BR18 business rules
 */
@Entity('password_reset_tokens')
@Index(['userId'])
@Index(['tokenHash'])
@Index(['status'])
@Index(['expiresAt'])
export class PasswordResetToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'user_id',
    type: 'uuid',
    comment: 'User requesting password reset',
  })
  userId: string;

  @Column({
    type: 'varchar',
    length: 255,
    unique: true,
    comment: 'Plain text token sent in email',
  })
  token: string;

  @Column({
    name: 'token_hash',
    type: 'varchar',
    length: 255,
    comment: 'Hashed version of token for secure storage',
  })
  tokenHash: string;

  @Column({
    name: 'reset_method',
    type: 'enum',
    enum: ['admin_reset_link', 'admin_temporary_password'],
    nullable: true, // Allow null for existing records
    comment: 'Method used for password reset (?)',
  })
  resetMethod?: string;

  @Column({
    name: 'initiated_by',
    type: 'uuid',
    nullable: true, // Allow null for existing records
    comment: 'User ID who initiated the password reset (?)',
  })
  initiatedBy?: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'used', 'expired', 'invalidated'],
    default: 'pending',
    comment: 'Token status',
  })
  status: string;

  @Column({
    name: 'ip_address',
    type: 'varchar',
    length: 45,
    comment: 'IP address where reset was requested',
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
    name: 'expires_at',
    type: 'timestamp',
    comment: 'Token expiration time (2 hours from creation)',
  })
  expiresAt: Date;

  @Column({
    name: 'used_at',
    type: 'timestamp',
    nullable: true,
    comment: 'When token was used for password reset',
  })
  usedAt?: Date;

  @Column({
    name: 'used_ip_address',
    type: 'varchar',
    length: 45,
    nullable: true,
    comment: 'IP address where token was used',
  })
  usedIpAddress?: string;

  @Column({
    name: 'used_user_agent',
    type: 'text',
    nullable: true,
    comment: 'User agent where token was used',
  })
  usedUserAgent?: string;

  @Column({
    name: 'invalidated_reason',
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Reason for token invalidation',
  })
  invalidatedReason?: string;

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

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'initiated_by' })
  initiatedByUser: User;
}
