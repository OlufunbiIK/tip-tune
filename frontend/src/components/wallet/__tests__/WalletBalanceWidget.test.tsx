import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import '@testing-library/jest-dom';
import React from 'react';
import WalletBalanceWidget from '../WalletBalanceWidget';

jest.mock('../../../hooks/useWallet', () => ({
  useWallet: () => ({
    isConnected: true,
    balance: { asset: 'XLM', balance: '12.3456789' },
    refreshBalance: jest.fn(),
  }),
}));

describe('WalletBalanceWidget', () => {
  it('renders XLM balance when wallet is connected', () => {
    render(<WalletBalanceWidget />);

    expect(screen.getByLabelText('Wallet balance')).toBeInTheDocument();
    expect(screen.getByText(/12\.35 XLM/)).toBeInTheDocument();
  });
});

