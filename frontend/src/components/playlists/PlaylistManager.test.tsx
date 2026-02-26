import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlaylistManager from './PlaylistManager';
import { playlistService } from '../../services/playlistService';

vi.mock('../../services/playlistService', () => ({
  playlistService: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    duplicate: vi.fn(),
    share: vi.fn(),
    addTrack: vi.fn(),
    removeTrack: vi.fn(),
    reorderTracks: vi.fn(),
  },
}));

describe('PlaylistManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(playlistService.getAll).mockResolvedValue({
      data: [
        {
          id: 'p1',
          userId: 'u1',
          name: 'Daily Mix',
          isPublic: false,
          approvalRequired: false,
          trackCount: 1,
          totalDuration: 100,
          createdAt: '',
          updatedAt: '',
          playlistTracks: [],
        },
      ],
      meta: {
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    } as any);
  });

  it('renders playlists and opens create modal', async () => {
    const user = userEvent.setup();
    render(<PlaylistManager />);

    await waitFor(() => {
      expect(screen.getByText('Daily Mix')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'New Playlist' }));
    expect(screen.getByText('Create Playlist')).toBeInTheDocument();
  });
});
