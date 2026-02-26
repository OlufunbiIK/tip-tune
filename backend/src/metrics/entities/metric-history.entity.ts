import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('metrics_history')
@Index(['metricName', 'timestamp'])
export class MetricHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  metricName: string;

  @Column('decimal', { precision: 20, scale: 6 })
  value: number;

  @Column('jsonb', { nullable: true })
  labels: Record<string, string>;

  @CreateDateColumn()
  timestamp: Date;
}
