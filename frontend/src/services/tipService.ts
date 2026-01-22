import apiClient from '../utils/api';
import { Tip, TipStatus, PaginatedResponse } from '../types';

export const tipService = {
  create: async (tipData: {
    fromUserId: string;
    toArtistId: string;
    trackId?: string;
    amount: number;
    usdValue: number;
    stellarTxHash: string;
    message?: string;
  }): Promise<Tip> => {
    const response = await apiClient.post<Tip>('/tips', tipData);
    return response.data;
  },

  getById: async (id: string): Promise<Tip> => {
    const response = await apiClient.get<Tip>(`/tips/${id}`);
    return response.data;
  },

  getUserHistory: async (
    userId: string,
    page = 1,
    limit = 10,
    status?: TipStatus
  ): Promise<PaginatedResponse<Tip>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (status) params.append('status', status);
    
    const response = await apiClient.get<PaginatedResponse<Tip>>(
      `/tips/user/${userId}/history?${params.toString()}`
    );
    return response.data;
  },

  getArtistReceived: async (
    artistId: string,
    page = 1,
    limit = 10,
    status?: TipStatus
  ): Promise<PaginatedResponse<Tip>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (status) params.append('status', status);
    
    const response = await apiClient.get<PaginatedResponse<Tip>>(
      `/tips/artist/${artistId}/received?${params.toString()}`
    );
    return response.data;
  },

  getArtistStats: async (artistId: string) => {
    const response = await apiClient.get(`/tips/artist/${artistId}/stats`);
    return response.data;
  },

  getByTrack: async (
    trackId: string,
    page = 1,
    limit = 10,
    status?: TipStatus
  ): Promise<PaginatedResponse<Tip>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (status) params.append('status', status);
    
    const response = await apiClient.get<PaginatedResponse<Tip>>(
      `/tips/track/${trackId}?${params.toString()}`
    );
    return response.data;
  },

  updateStatus: async (id: string, status: TipStatus): Promise<Tip> => {
    const response = await apiClient.patch<Tip>(`/tips/${id}/status`, { status });
    return response.data;
  },
};
