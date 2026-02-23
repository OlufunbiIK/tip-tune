import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import SocialShareModal from '../SocialShareModal';
import type { TipHistoryItem } from '../../../types';

const baseTip: TipHistoryItem = {
  id: 'tip-1',
  tipperName: 'Alice',
  tipperAvatar: 'https://example.com/avatar.png',
  amount: 10.5,
  message: 'Great track!',
  timestamp: '2024-06-15T14:30:00.000Z',
  trackId: 'track-1',
  trackTitle: 'Neon Dreams',
  artistName: 'Artist A',
  assetCode: 'XLM',
  usdAmount: 2.5,
  stellarTxHash: 'abc123',
};

describe('SocialShareModal', () => {
  const originalOpen = window.open;

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    window.open = jest.fn(() => null) as unknown as typeof window.open;
  });

  afterEach(() => {
    window.open = originalOpen;
  });

  it('renders when open and shows controls', () => {
    render(
      <SocialShareModal
        isOpen
        onClose={() => {}}
        tip={baseTip}
        variant="sent"
      />
    );

    expect(screen.getByTestId('social-share-modal')).toBeInTheDocument();
    expect(screen.getByText(/Card theme/i)).toBeInTheDocument();
    expect(screen.getByText(/Custom message/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download PNG/i })).toBeInTheDocument();
  });

  it('opens Twitter share when Share on X is clicked', async () => {
    const user = userEvent.setup();

    render(
      <SocialShareModal
        isOpen
        onClose={() => {}}
        tip={baseTip}
        variant="sent"
      />
    );

    const btn = screen.getByRole('button', { name: /Share on X/i });
    await user.click(btn);

    expect(window.open).toHaveBeenCalled();
  });
});

