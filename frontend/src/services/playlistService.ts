import apiClient from '../utils/api';
import {
  ActivityFeedResponse,
  PaginatedResponse,
  Playlist,
  PlaylistChangeRequest,
  PlaylistCollaborator,
  Track,
} from '../types';

export const playlistService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    isPublic?: boolean;
  }): Promise<PaginatedResponse<Playlist>> => {
    const response = await apiClient.get<PaginatedResponse<Playlist>>('/playlists', {
      params,
    });
    return response.data;
  },

  getById: async (id: string): Promise<Playlist> => {
    const response = await apiClient.get<Playlist>(`/playlists/${id}`);
    return response.data;
  },

  addTrack: async (
    playlistId: string,
    payload: { trackId: string; position?: number },
  ): Promise<Playlist | PlaylistChangeRequest> => {
    const response = await apiClient.post<Playlist | PlaylistChangeRequest>(
      `/playlists/${playlistId}/tracks`,
      payload,
    );
    return response.data;
  },

  removeTrack: async (
    playlistId: string,
    trackId: string,
  ): Promise<Playlist | PlaylistChangeRequest> => {
    const response = await apiClient.delete<Playlist | PlaylistChangeRequest>(
      `/playlists/${playlistId}/tracks/${trackId}`,
    );
    return response.data;
  },

  reorderTracks: async (
    playlistId: string,
    tracks: { trackId: string; position: number }[],
  ): Promise<Playlist | PlaylistChangeRequest> => {
    const response = await apiClient.patch<Playlist | PlaylistChangeRequest>(
      `/playlists/${playlistId}/tracks/reorder`,
      { tracks },
    );
    return response.data;
  },

  listCollaborators: async (playlistId: string): Promise<PlaylistCollaborator[]> => {
    const response = await apiClient.get<PlaylistCollaborator[]>(
      `/playlists/${playlistId}/collaborators`,
    );
    return response.data;
  },

  inviteCollaborator: async (
    playlistId: string,
    identifier: string,
    role?: string,
  ): Promise<PlaylistCollaborator> => {
    const response = await apiClient.post<PlaylistCollaborator>(
      `/playlists/${playlistId}/collaborators`,
      { identifier, role },
    );
    return response.data;
  },

  acceptCollaboratorInvite: async (
    playlistId: string,
    collaboratorId: string,
  ): Promise<PlaylistCollaborator> => {
    const response = await apiClient.post<PlaylistCollaborator>(
      `/playlists/${playlistId}/collaborators/${collaboratorId}/accept`,
    );
    return response.data;
  },

  rejectCollaboratorInvite: async (
    playlistId: string,
    collaboratorId: string,
  ): Promise<void> => {
    await apiClient.post(
      `/playlists/${playlistId}/collaborators/${collaboratorId}/reject`,
    );
  },

  updateCollaboratorRole: async (
    playlistId: string,
    collaboratorId: string,
    role: string,
  ): Promise<PlaylistCollaborator> => {
    const response = await apiClient.patch<PlaylistCollaborator>(
      `/playlists/${playlistId}/collaborators/${collaboratorId}`,
      { role },
    );
    return response.data;
  },

  removeCollaborator: async (
    playlistId: string,
    collaboratorId: string,
  ): Promise<void> => {
    await apiClient.delete(
      `/playlists/${playlistId}/collaborators/${collaboratorId}`,
    );
  },

  listChangeRequests: async (
    playlistId: string,
    status?: string,
  ): Promise<PlaylistChangeRequest[]> => {
    const response = await apiClient.get<PlaylistChangeRequest[]>(
      `/playlists/${playlistId}/change-requests`,
      { params: status ? { status } : undefined },
    );
    return response.data;
  },

  approveChangeRequest: async (
    playlistId: string,
    changeRequestId: string,
  ): Promise<Playlist> => {
    const response = await apiClient.post<Playlist>(
      `/playlists/${playlistId}/change-requests/${changeRequestId}/approve`,
    );
    return response.data;
  },

  rejectChangeRequest: async (
    playlistId: string,
    changeRequestId: string,
  ): Promise<PlaylistChangeRequest> => {
    const response = await apiClient.post<PlaylistChangeRequest>(
      `/playlists/${playlistId}/change-requests/${changeRequestId}/reject`,
    );
    return response.data;
  },

  getActivities: async (
    playlistId: string,
  ): Promise<ActivityFeedResponse> => {
    const response = await apiClient.get<ActivityFeedResponse>(
      `/playlists/${playlistId}/activities`,
    );
    return response.data;
  },

  previewSmartPlaylist: async (
    criteria: Record<string, any>,
  ): Promise<Track[]> => {
    const response = await apiClient.post<Track[]>(`/playlists/smart/preview`, {
      criteria,
    });
    return response.data;
  },

  createSmartPlaylist: async (
    payload: {
      name: string;
      description?: string;
      isPublic?: boolean;
      coverImage?: string;
      criteria: Record<string, any>;
      autoUpdate?: boolean;
    },
  ): Promise<Playlist> => {
    const response = await apiClient.post<Playlist>(`/playlists/smart`, payload);
    return response.data;
  },
};
