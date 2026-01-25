import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from "typeorm";
import { Artist } from "../../artists/entities/artist.entity";
import { GoalSupporter } from "./goal-supporter.entity";
import { Tip } from "../../tips/entities/tip.entity";

export enum GoalStatus {
  ACTIVE = "active",
  COMPLETED = "completed",
  EXPIRED = "expired",
}

@Entity("tip_goals")
export class TipGoal {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  artistId: string;

  @Column()
  title: string;

  @Column({ type: "text" })
  description: string;

  @Column({ type: "decimal", precision: 18, scale: 2 })
  goalAmount: number;

  @Column({ type: "decimal", precision: 18, scale: 2, default: 0 })
  currentAmount: number;

  @Column({ type: "timestamp", nullable: true })
  deadline: Date;

  @Column({
    type: "enum",
    enum: GoalStatus,
    default: GoalStatus.ACTIVE,
  })
  status: GoalStatus;

  @Column({ type: "jsonb", nullable: true })
  rewards: any;

  @Column({ type: "int", default: 0 })
  supporterCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Artist, (artist) => artist.goals, { onDelete: "CASCADE" })
  @JoinColumn({ name: "artistId" })
  artist: Artist;

  @OneToMany(() => GoalSupporter, (supporter) => supporter.goal)
  supporters: GoalSupporter[];

  @OneToMany(() => Tip, (tip) => tip.goal)
  tips: Tip[];
}
