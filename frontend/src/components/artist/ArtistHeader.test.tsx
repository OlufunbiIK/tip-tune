import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ArtistHeader from './ArtistHeader';

describe('ArtistHeader', () => {
  it('fires follow and share actions', () => {
    const onFollowToggle = vi.fn();
    const onShare = vi.fn();

    render(
      <ArtistHeader
        artistName="DJ Melodica"
        coverImage="https://example.com/cover.jpg"
        profileImage="https://example.com/avatar.jpg"
        followerCount={500}
        isFollowing={false}
        onFollowToggle={onFollowToggle}
        onShare={onShare}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Follow' }));
    fireEvent.click(screen.getByRole('button', { name: 'Share Profile' }));

    expect(onFollowToggle).toHaveBeenCalledTimes(1);
    expect(onShare).toHaveBeenCalledTimes(1);
  });
});
