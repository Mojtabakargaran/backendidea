import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Tenant } from './tenant.entity';

@Entity('serial_number_sequences')
@Index(['tenant_id'], { unique: true, where: 'is_active = true' })
export class SerialNumberSequence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ 
    type: 'varchar', 
    length: 10, 
    default: 'SN',
    comment: 'Prefix for generated serial numbers'
  })
  prefix: string;

  @Column({ 
    type: 'bigint', 
    default: 1,
    comment: 'Current sequence number'
  })
  current_number: number;

  @Column({ 
    type: 'integer', 
    default: 8,
    comment: 'Number of digits to pad the sequence number'
  })
  padding_length: number;

  @Column({ 
    type: 'boolean', 
    default: true,
    comment: 'Whether this sequence is active for generating new serial numbers'
  })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  // Relations
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  /**
   * Generate the next serial number for this sequence
   */
  generateSerialNumber(): string {
    const paddedNumber = this.current_number.toString().padStart(this.padding_length, '0');
    return `${this.prefix}${paddedNumber}`;
  }

  /**
   * Increment the sequence number
   */
  incrementSequence(): void {
    this.current_number++;
  }
}
