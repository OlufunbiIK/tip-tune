import { MessageFilterService } from './message-filter.service';
import { BlockedKeyword, KeywordSeverity } from './entities/blocked-keyword.entity';

describe('MessageFilterService', () => {
  let service: MessageFilterService;

  beforeEach(() => {
    service = new MessageFilterService();
  });

  function keyword(keyword: string, severity: KeywordSeverity): BlockedKeyword {
    return {
      id: 'id',
      keyword,
      severity,
      addedById: 'user',
      addedBy: null as any,
      artistId: null,
      artist: null as any,
      createdAt: new Date(),
    };
  }

  it('approves clean messages', () => {
    const result = service.applyFilters('hello there', []);
    expect(result.result).toBe('approved');
    expect(result.reason).toBeNull();
  });

  it('blocks high severity keyword', () => {
    const keywords = [keyword('scam', KeywordSeverity.HIGH)];
    const result = service.applyFilters('this is a scam offer', keywords);
    expect(result.result).toBe('blocked');
    expect(result.reason).toContain('keyword:scam');
  });

  it('flags medium severity keyword', () => {
    const keywords = [keyword('spam', KeywordSeverity.MEDIUM)];
    const result = service.applyFilters('possible spam content', keywords);
    expect(result.result).toBe('flagged');
  });

  it('filters low severity keyword', () => {
    const keywords = [keyword('silly', KeywordSeverity.LOW)];
    const result = service.applyFilters('this is silly', keywords);
    expect(result.result).toBe('filtered');
    expect(result.sanitizedMessage).not.toContain('silly');
  });

  it('uses regex patterns when no keywords match', () => {
    const result = service.applyFilters('visit http://example.com now', []);
    expect(result.result === 'filtered' || result.result === 'flagged' || result.result === 'blocked').toBe(true);
    expect(result.reason).toContain('regex:');
  });
});

