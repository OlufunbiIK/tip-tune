import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { TipGoal } from "./tip-goal.entity";
import { User } from "../../users/entities/user.entity";

@Entity("goal_supporters")
export class GoalSupporter {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  goalId: string;

  @Column()
  userId: string;

  @Column({ type: "decimal", precision: 18, scale: 2 })
  amountContributed: number;

  @Column({ nullable: true })
  rewardTier: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => TipGoal, (goal) => goal.supporters, { onDelete: "CASCADE" })
  @JoinColumn({ name: "goalId" })
  goal: TipGoal;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;
}
