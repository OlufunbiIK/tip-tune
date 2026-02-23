import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum AdminRoleType {
  SUPER_ADMIN = 'super_admin',
  MODERATOR = 'moderator',
  SUPPORT = 'support',
  ANALYST = 'analyst',
}

@Entity('admin_roles')
export class AdminRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: AdminRoleType,
  })
  role: AdminRoleType;

  @Column({ type: 'jsonb' })
  permissions: string[];

  @Column({ type: 'uuid', nullable: true })
  grantedBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'grantedBy' })
  grantedByUser: User;

  @CreateDateColumn()
  createdAt: Date;
}
