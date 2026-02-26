/**
 * Tests for GiftRecipientSearch component
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GiftRecipientSearch from '../GiftRecipientSearch';
import type { GiftUserRef } from '../../../types';

const mockUsers: GiftUserRef[] = [
  { id: 'u1', username: 'stellar_fan', displayName: 'Stellar Fan' },
  { id: 'u2', username: 'music_lover', displayName: 'Music Lover' },
];

const mockSearch = jest.fn(async (query: string) => {
  return mockUsers.filter((u) =>
    u.username.includes(query) || u.displayName!.toLowerCase().includes(query)
  );
});

describe('GiftRecipientSearch', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockSearch.mockClear();
  });
  afterEach(() => jest.useRealTimers());

  it('renders search input when no user selected', () => {
    render(<GiftRecipientSearch value={null} onChange={jest.fn()} />);
    expect(screen.getByTestId('gift-recipient-search')).toBeTruthy();
    expect(screen.getByRole('textbox')).toBeTruthy();
  });

  it('shows selected user card when value is set', () => {
    render(
      <GiftRecipientSearch
        value={mockUsers[0]}
        onChange={jest.fn()}
      />
    );
    expect(screen.getByTestId('gift-recipient-selected')).toBeTruthy();
    expect(screen.getByText('Stellar Fan')).toBeTruthy();
  });

  it('calls onChange with null when clear button clicked', () => {
    const onChange = jest.fn();
    render(
      <GiftRecipientSearch value={mockUsers[0]} onChange={onChange} />
    );
    fireEvent.click(screen.getByLabelText('Remove recipient'));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('shows results after debounce when typing >=2 chars', async () => {
    render(
      <GiftRecipientSearch
        value={null}
        onChange={jest.fn()}
        onSearch={mockSearch}
      />
    );
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'stellar' } });
    jest.advanceTimersByTime(400);
    await waitFor(() => {
      expect(mockSearch).toHaveBeenCalledWith('stellar');
    });
  });

  it('calls onChange when a result is selected', async () => {
    const onChange = jest.fn();
    render(
      <GiftRecipientSearch
        value={null}
        onChange={onChange}
        onSearch={async () => mockUsers}
      />
    );
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'stellar' } });
    jest.advanceTimersByTime(400);
    await waitFor(() => {
      const btn = screen.getAllByRole('option')[0];
      fireEvent.click(btn);
    });
    expect(onChange).toHaveBeenCalledWith(mockUsers[0]);
  });

  it('does not search when query < 2 chars', () => {
    render(
      <GiftRecipientSearch
        value={null}
        onChange={jest.fn()}
        onSearch={mockSearch}
      />
    );
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 's' } });
    jest.advanceTimersByTime(400);
    expect(mockSearch).not.toHaveBeenCalled();
  });
});
