import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import TipFilters, { defaultTipFilters } from '../TipFilters';

describe('TipFilters', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders search input and filter controls', () => {
    render(
      <TipFilters filters={defaultTipFilters} onFiltersChange={mockOnChange} />
    );
    expect(screen.getByPlaceholderText(/Search artist or user/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Sort by/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Asset type/)).toBeInTheDocument();
  });

  it('calls onFiltersChange when search query changes', async () => {
    const user = userEvent.setup();
    render(
      <TipFilters filters={defaultTipFilters} onFiltersChange={mockOnChange} />
    );
    await user.type(screen.getByPlaceholderText(/Search artist or user/), 'test');
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({ searchQuery: expect.any(String) })
    );
  });

  it('calls onFiltersChange when sort option changes', async () => {
    const user = userEvent.setup();
    render(
      <TipFilters filters={defaultTipFilters} onFiltersChange={mockOnChange} />
    );
    await user.selectOptions(screen.getByLabelText(/Sort by/), 'oldest');
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({ sort: 'oldest' })
    );
  });

  it('displays result count when provided', () => {
    render(
      <TipFilters
        filters={defaultTipFilters}
        onFiltersChange={mockOnChange}
        resultCount={42}
      />
    );
    expect(screen.getByText('42 results')).toBeInTheDocument();
  });

  it('has tip-filters test id', () => {
    render(
      <TipFilters filters={defaultTipFilters} onFiltersChange={mockOnChange} />
    );
    expect(screen.getByTestId('tip-filters')).toBeInTheDocument();
  });
});
