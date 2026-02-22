import api from '../utils/api';
import { TipGoal, CreateGoalDto, UpdateGoalDto } from '../types/goal.types';

export const goalService = {
  async createGoal(data: CreateGoalDto): Promise<TipGoal> {
    const response = await api.post<TipGoal>('/goals', data);
    return response.data;
  },

  async getArtistGoals(artistId: string): Promise<TipGoal[]> {
    const response = await api.get<TipGoal[]>(`/goals/artist/${artistId}`);
    return response.data;
  },

  async getGoal(id: string): Promise<TipGoal> {
    const response = await api.get<TipGoal>(`/goals/${id}`);
    return response.data;
  },

  async updateGoal(id: string, data: UpdateGoalDto): Promise<TipGoal> {
    const response = await api.patch<TipGoal>(`/goals/${id}`, data);
    return response.data;
  },

  async deleteGoal(id: string): Promise<void> {
    await api.delete(`/goals/${id}`);
  },
};
