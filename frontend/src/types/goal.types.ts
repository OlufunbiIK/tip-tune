export enum GoalStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
}

export interface TipGoal {
  id: string;
  artistId: string;
  title: string;
  description: string;
  goalAmount: number;
  currentAmount: number;
  deadline: string;
  status: GoalStatus;
  rewards?: any;
  supporterCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGoalDto {
  title: string;
  description: string;
  goalAmount: number;
  deadline: string;
  rewards?: any;
}

export interface UpdateGoalDto extends Partial<CreateGoalDto> {
  status?: GoalStatus;
}
