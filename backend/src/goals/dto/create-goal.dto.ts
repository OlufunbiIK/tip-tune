import { IsNotEmpty, IsNumber, IsString, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { GoalStatus } from '../entities/tip-goal.entity';

export class CreateGoalDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsNumber()
  goalAmount: number;

  @IsNotEmpty()
  @IsDateString()
  deadline: Date;
  
  @IsOptional()
  rewards?: any;
}
