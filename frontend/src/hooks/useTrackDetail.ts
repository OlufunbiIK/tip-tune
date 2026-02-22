import { useState, useEffect } from 'react';
import { Track } from '@/types';
import { trackService } from '@/services/trackService';

interface Comment {
  id: string;
  content: string;
  user: {
    username: string;
    avatar?: string;
  };
  createdAt: string;
  likesCount: number;
  repliesCount: number;
  userLiked?: boolean;
}

interface UseTrackDetailReturn {
  track: Track | null;
  comments: Comment[];
  loading: boolean;
  loadingComments: boolean;
  error: string | null;
  loadTrack: (trackId: string) => Promise<void>;
  loadComments: (trackId: string) => Promise<void>;
  refreshComments: () => Promise<void>;
}

export const useTrackDetail = (initialTrackId?: string): UseTrackDetailReturn => {
  const [track, setTrack] = useState<Track | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load track data
  const loadTrack = async (trackId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const trackData = await trackService.getById(trackId);
      setTrack(trackData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load track';
      setError(errorMessage);
      console.error('Failed to load track:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load comments for a track
  const loadComments = async (trackId: string) => {
    setLoadingComments(true);
    setError(null);
    try {
      // TODO: Implement actual comments API
      // const response = await api.get(`/comments/track/${trackId}`);
      // setComments(response.data.comments);
      // Mock data for now
      const mockComments: Comment[] = [
        {
          id: '1',
          content: `Amazing track! Love the melody 🎵 (trackId: ${trackId})`,
          user: { username: 'music_lover', avatar: '' },
          createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          likesCount: 12,
          repliesCount: 3,
        },
        // ...other mock comments...
      ];
      setComments(mockComments);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load comments';
      setError(errorMessage);
      console.error('Failed to load comments:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  // Refresh comments
  const refreshComments = async () => {
    if (track?.id) {
      await loadComments(track.id);
    }
  };

  // Load initial data if trackId is provided
  useEffect(() => {
    if (initialTrackId) {
      loadTrack(initialTrackId);
      loadComments(initialTrackId);
    }
  }, [initialTrackId]);

  return {
    track,
    comments,
    loading,
    loadingComments,
    error,
    loadTrack,
    loadComments,
    refreshComments,
  };
};