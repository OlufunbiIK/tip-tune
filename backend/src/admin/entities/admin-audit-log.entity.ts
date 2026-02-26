import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('admin_audit_logs')
@Index(['adminId', 'createdAt'])
@Index(['entityType', 'entityId'])
export class AdminAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  adminId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'adminId' })
  admin: User;

  @Column({ length: 100 })
  action: string;

  @Column({ length: 50 })
  entityType: string;

  @Column({ type: 'uuid' })
  entityId: string;

  @Column({ type: 'jsonb', nullable: true })
  previousState: any;

  @Column({ type: 'jsonb', nullable: true })
  newState: any;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ length: 45 })
  ipAddress: string;

  @CreateDateColumn()
  createdAt: Date;
}
