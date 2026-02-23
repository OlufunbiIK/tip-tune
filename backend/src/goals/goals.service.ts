import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipGoal, GoalStatus } from './entities/tip-goal.entity';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { ArtistsService } from '../artists/artists.service';

@Injectable()
export class GoalsService {
  constructor(
    @InjectRepository(TipGoal)
    private readonly goalsRepository: Repository<TipGoal>,
    private readonly artistsService: ArtistsService,
  ) {}

  async create(createGoalDto: CreateGoalDto, userId: string): Promise<TipGoal> {
    const artist = await this.artistsService.findByUser(userId);
    
    const goal = this.goalsRepository.create({
      ...createGoalDto,
      artistId: artist.id,
    });
    return this.goalsRepository.save(goal);
  }

  async findAllByArtist(artistId: string): Promise<TipGoal[]> {
    return this.goalsRepository.find({
      where: { artistId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<TipGoal> {
    const goal = await this.goalsRepository.findOne({
      where: { id },
      relations: ['supporters', 'supporters.user'],
    });

    if (!goal) {
      throw new NotFoundException(`Goal with ID ${id} not found`);
    }

    return goal;
  }

  async update(id: string, updateGoalDto: UpdateGoalDto, userId: string): Promise<TipGoal> {
    const goal = await this.findOne(id);
    const artist = await this.artistsService.findByUser(userId);
    
    if (goal.artistId !== artist.id) {
      throw new ForbiddenException(`You are not authorized to update this goal`);
    }

    Object.assign(goal, updateGoalDto);
    return this.goalsRepository.save(goal);
  }

  async remove(id: string, userId: string): Promise<void> {
    const goal = await this.findOne(id);
    const artist = await this.artistsService.findByUser(userId);
    
    if (goal.artistId !== artist.id) {
      throw new ForbiddenException(`You are not authorized to delete this goal`);
    }

    await this.goalsRepository.remove(goal);
  }

  async updateProgress(id: string, amount: number): Promise<TipGoal> {
    const goal = await this.findOne(id);
    goal.currentAmount = Number(goal.currentAmount) + Number(amount);
    
    if (goal.currentAmount >= goal.goalAmount && goal.status === GoalStatus.ACTIVE) {
      goal.status = GoalStatus.COMPLETED;
    }

    return this.goalsRepository.save(goal);
  }
}
