import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TipGoal, GoalStatus } from "./entities/tip-goal.entity";
import { GoalSupporter } from "./entities/goal-supporter.entity";
import { CreateGoalDto } from "./dto/create-goal.dto";
import { UpdateGoalDto } from "./dto/update-goal.dto";

@Injectable()
export class GoalsService {
  constructor(
    @InjectRepository(TipGoal)
    private readonly goalsRepository: Repository<TipGoal>,
    @InjectRepository(GoalSupporter)
    private readonly supportersRepository: Repository<GoalSupporter>,
  ) {}

  async create(
    artistId: string,
    createGoalDto: CreateGoalDto,
  ): Promise<TipGoal> {
    const goal = this.goalsRepository.create({
      ...createGoalDto,
      artistId,
    });
    return this.goalsRepository.save(goal);
  }

  async findAllByArtist(artistId: string): Promise<TipGoal[]> {
    return this.goalsRepository.find({
      where: { artistId },
      order: { createdAt: "DESC" },
    });
  }

  async findOne(id: string): Promise<TipGoal> {
    const goal = await this.goalsRepository.findOne({
      where: { id },
      relations: ["supporters", "supporters.user"],
    });

    if (!goal) {
      throw new NotFoundException(`Goal with ID ${id} not found`);
    }

    return goal;
  }

  async update(id: string, updateGoalDto: UpdateGoalDto): Promise<TipGoal> {
    const goal = await this.findOne(id);
    Object.assign(goal, updateGoalDto);
    return this.goalsRepository.save(goal);
  }

  async addSupport(
    goalId: string,
    userId: string,
    amount: number,
    rewardTier?: string,
  ) {
    const goal = await this.findOne(goalId);

    // Create supporter record
    const supporter = this.supportersRepository.create({
      goalId,
      userId,
      amountContributed: amount,
      rewardTier,
    });
    await this.supportersRepository.save(supporter);

    // Update goal stats
    goal.currentAmount = Number(goal.currentAmount) + Number(amount);
    goal.supporterCount += 1;

    // Check for completion logic if needed
    // if (goal.status === GoalStatus.ACTIVE && goal.currentAmount >= goal.goalAmount) { ... }

    return this.goalsRepository.save(goal);
  }
}
