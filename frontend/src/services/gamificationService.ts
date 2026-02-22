import apiClient from '../utils/api';
import { Badge, UserBadge } from '../types';

export const gamificationService = {
    getAllBadges: async (): Promise<Badge[]> => {
        const response = await apiClient.get<Badge[]>('/gamification/badges');
        // Note: The controller returns array directly, not wrapped in {data: ...} usually with TypeORM methods unless interceptor is used.
        // However, tipService uses .data on response. Assuming apiClient returns axios response.
        return response.data;
    },

    getUserBadges: async (userId: string): Promise<UserBadge[]> => {
        const response = await apiClient.get<UserBadge[]>(`/gamification/user/${userId}`);
        return response.data;
    },
};
