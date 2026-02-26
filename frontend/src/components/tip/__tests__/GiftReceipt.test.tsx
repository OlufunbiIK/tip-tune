/**
 * Tests for GiftReceipt component
 */
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import GiftReceipt from '../GiftReceipt';

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

function renderWithRouter(giftId = 'gift-test-1') {
  return render(
    <MemoryRouter initialEntries={[`/gifts/${giftId}`]}>
      <Routes>
        <Route path="/gifts/:giftId" element={<GiftReceipt />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('GiftReceipt', () => {
  it('shows loading state initially', () => {
    renderWithRouter();
    // Should show loader before data resolves
    expect(screen.getByText(/Loading gift receipt/i)).toBeTruthy();
  });

  it('renders receipt page after data loads', async () => {
    renderWithRouter('gift-test-2');
    await waitFor(
      () => expect(screen.getByTestId('gift-receipt-page')).toBeTruthy(),
      { timeout: 2000 }
    );
  });

  it('shows gift parties section', async () => {
    renderWithRouter('gift-test-3');
    await waitFor(
      () => expect(screen.getByTestId('gift-parties')).toBeTruthy(),
      { timeout: 2000 }
    );
  });

  it('shows share actions', async () => {
    renderWithRouter('gift-test-4');
    await waitFor(
      () => expect(screen.getByTestId('gift-receipt-actions')).toBeTruthy(),
      { timeout: 2000 }
    );
  });

  it('shows copy link button', async () => {
    renderWithRouter('gift-test-5');
    await waitFor(
      () => expect(screen.getByTestId('copy-link-btn')).toBeTruthy(),
      { timeout: 2000 }
    );
  });
});
