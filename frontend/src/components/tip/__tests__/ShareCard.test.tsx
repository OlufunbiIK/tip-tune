import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import '@testing-library/jest-dom';
import ShareCard from '../ShareCard';

describe('ShareCard', () => {
  it('renders artist name, tip amount, and branding', () => {
    render(
      <ShareCard
        artistName="Artist A"
        trackTitle="Neon Dreams"
        tipAmount={10.5}
        assetCode="XLM"
        usdAmount={3.25}
        message="Great set!"
        tipperName="You"
        tipDate="2024-06-15T14:30:00.000Z"
      />
    );

    expect(screen.getByTestId('share-card')).toBeInTheDocument();
    expect(screen.getByText('Artist A')).toBeInTheDocument();
    expect(screen.getByText(/10\.50 XLM/)).toBeInTheDocument();
    expect(screen.getByText(/TipTune/)).toBeInTheDocument();
    expect(screen.getByText(/Powered by Stellar/)).toBeInTheDocument();
  });
});

