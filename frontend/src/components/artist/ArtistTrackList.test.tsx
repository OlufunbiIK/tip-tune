import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ArtistTrackList from './ArtistTrackList';
import { Track } from '@/types';

const tracks: Track[] = [
  {
    id: 'track-1',
    title: 'Neon Dreams',
    coverArt: 'https://example.com/cover.jpg',
    plays: 100,
    tips: 200,
    artist: { id: 'artist-1', artistName: 'DJ Melodica' },
    filename: 'https://example.com/track.mp3',
  },
];

describe('ArtistTrackList', () => {
  it('toggles playback button state', async () => {
    const playMock = vi.fn().mockResolvedValue(undefined);
    const pauseMock = vi.fn();

    Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: playMock,
    });
    Object.defineProperty(window.HTMLMediaElement.prototype, 'pause', {
      configurable: true,
      value: pauseMock,
    });

    render(<ArtistTrackList tracks={tracks} />);

    const button = screen.getByRole('button', { name: /play neon dreams/i });
    fireEvent.click(button);
    expect(playMock).toHaveBeenCalledTimes(1);

    const pauseButton = await screen.findByRole('button', { name: /pause neon dreams/i });
    fireEvent.click(pauseButton);
    expect(pauseMock).toHaveBeenCalledTimes(1);
  });
});
