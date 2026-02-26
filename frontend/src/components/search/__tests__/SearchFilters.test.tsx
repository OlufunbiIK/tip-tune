import { render } from '@testing-library/react';
import { screen, fireEvent } from '@testing-library/dom';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import SearchFilters from '../SearchFilters';
import { SearchFiltersState } from '../../../types/search.types';

describe('SearchFilters', () => {
  const mockFilters: SearchFiltersState = {
    contentType: 'all',
    genre: '',
    releaseDateFrom: '',
    releaseDateTo: '',
    sort: 'relevance',
  };
  const mockOnFiltersChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all filter inputs', () => {
    render(
      <SearchFilters
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    expect(screen.getByLabelText('Content type')).toBeInTheDocument();
    expect(screen.getByLabelText('Genre filter')).toBeInTheDocument();
    expect(screen.getByLabelText('Release date from')).toBeInTheDocument();
    expect(screen.getByLabelText('Release date to')).toBeInTheDocument();
    expect(screen.getByLabelText('Sort by')).toBeInTheDocument();
  });

  it('calls onFiltersChange when content type changes', () => {
    render(
      <SearchFilters
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    fireEvent.change(screen.getByLabelText('Content type'), {
      target: { value: 'artist' },
    });

    // Since we use functional update in component: onFiltersChange((prev) => ...)
    // We check if it was called with a function
    expect(mockOnFiltersChange).toHaveBeenCalledWith(expect.any(Function));
  });

  it('displays result count when provided', () => {
    render(
      <SearchFilters
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        resultCount={42}
      />
    );

    expect(screen.getByText('42 results')).toBeInTheDocument();
  });
});
