import { paginate } from './paginate.helper';

describe('paginate helper', () => {
  it('returns correct meta for first page', () => {
    const data = Array(20).fill({});
    const result = paginate(data, { page: 1, limit: 20, total: 120 });
    expect(result.meta).toEqual({
      total: 120,
      page: 1,
      limit: 20,
      totalPages: 6,
      hasNextPage: true,
      hasPreviousPage: false,
    });
  });

  it('returns correct meta for last page', () => {
    const data = Array(20).fill({});
    const result = paginate(data, { page: 6, limit: 20, total: 120 });
    expect(result.meta).toEqual({
      total: 120,
      page: 6,
      limit: 20,
      totalPages: 6,
      hasNextPage: false,
      hasPreviousPage: true,
    });
  });

  it('throws error if limit > 100', () => {
    expect(() => paginate([], { page: 1, limit: 101, total: 0 })).toThrow('Limit cannot exceed 100');
  });
});
