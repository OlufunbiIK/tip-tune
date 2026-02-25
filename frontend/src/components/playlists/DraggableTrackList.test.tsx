import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DraggableTrackList from './DraggableTrackList';

describe('DraggableTrackList', () => {
  it('calls remove callback', async () => {
    const user = userEvent.setup();
    const onReorder = vi.fn();
    const onRemove = vi.fn();
    render(
      <DraggableTrackList
        tracks={[
          {
            id: 't1',
            title: 'Track One',
            coverArt: '',
            plays: 1,
            tips: 0,
            artist: { id: 'a1', artistName: 'Artist One' },
          },
        ]}
        onReorder={onReorder}
        onRemove={onRemove}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
