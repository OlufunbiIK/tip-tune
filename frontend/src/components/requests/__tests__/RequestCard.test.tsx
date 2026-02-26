import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import '@testing-library/jest-dom';
import RequestCard from '../RequestCard';
import type { SongRequest } from '../types';

const baseRequest: SongRequest = {
  id: 'req-1',
  trackId: 'track-1',
  trackTitle: 'Neon Dreams',
  tipAmount: 10,
  assetCode: 'XLM',
  fanName: 'Alice',
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  status: 'pending',
};

describe('RequestCard', () => {
  it('renders fan name, track title, and tip amount', () => {
    render(<RequestCard request={baseRequest} />);

    expect(screen.getByTestId('request-card')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText(/Neon Dreams/)).toBeInTheDocument();
    expect(screen.getByText(/10\.00 XLM/)).toBeInTheDocument();
  });
});

