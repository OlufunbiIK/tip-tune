import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import TipHistoryPage from '../TipHistoryPage';

jest.mock('../../hooks/useWallet', () => ({
  useWallet: () => ({ publicKey: null }),
}));

describe('TipHistoryPage', () => {
  it('renders page title and tabs', () => {
    render(
      <MemoryRouter>
        <TipHistoryPage />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: /Tip History/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Sent' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Received' })).toBeInTheDocument();
  });

  it('renders Export to CSV button', () => {
    render(
      <MemoryRouter>
        <TipHistoryPage />
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: /Export to CSV/i })).toBeInTheDocument();
  });

  it('Sent tab is selected by default', () => {
    render(
      <MemoryRouter>
        <TipHistoryPage />
      </MemoryRouter>
    );
    expect(screen.getByRole('tab', { name: 'Sent' })).toHaveAttribute('aria-selected', 'true');
  });

  it('switches to Received tab on click', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <TipHistoryPage />
      </MemoryRouter>
    );
    await user.click(screen.getByRole('tab', { name: 'Received' }));
    expect(screen.getByRole('tab', { name: 'Received' })).toHaveAttribute('aria-selected', 'true');
  });
});
