import apiClient from '../utils/api';
import { Track } from '../types';

export const trackService = {
  getAll: async (): Promise<Track[]> => {
    const response = await apiClient.get<Track[]>('/tracks');
    return response.data;
  },

  getPublic: async (): Promise<Track[]> => {
    const response = await apiClient.get<Track[]>('/tracks/public');
    return response.data;
  },

  getById: async (id: string): Promise<Track> => {
    const response = await apiClient.get<Track>(`/tracks/${id}`);
    return response.data;
  },

  search: async (query: string): Promise<Track[]> => {
    const response = await apiClient.get<Track[]>(`/tracks/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },

  getByArtist: async (artist: string): Promise<Track[]> => {
    const response = await apiClient.get<Track[]>(`/tracks/artist/${encodeURIComponent(artist)}`);
    return response.data;
  },

  getByGenre: async (genre: string): Promise<Track[]> => {
    const response = await apiClient.get<Track[]>(`/tracks/genre/${encodeURIComponent(genre)}`);
    return response.data;
  },

  incrementPlayCount: async (id: string): Promise<Track> => {
    const response = await apiClient.patch<Track>(`/tracks/${id}/play`);
    return response.data;
  },
};
