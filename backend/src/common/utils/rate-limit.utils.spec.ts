import {
  getClientIp,
  isIpWhitelisted,
  parseWhitelist,
  calculateRetryAfter,
  formatResetTime,
  isRequestAuthenticated,
  getRateLimitKey,
  parseRateLimit,
  createRateLimitMessage,
  parseRateLimitHeaders,
  isRateLimitWarning,
  formatRateLimitLog,
} from './rate-limit.utils';

describe('Rate Limit Utils', () => {
  describe('getClientIp', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const request = {
        headers: {
          'x-forwarded-for': '203.0.113.1, 198.51.100.1',
        },
        ip: '192.168.1.1',
        socket: { remoteAddress: '10.0.0.1' },
      } as any;

      expect(getClientIp(request)).toBe('203.0.113.1');
    });

    it('should extract IP from x-real-ip header', () => {
      const request = {
        headers: {
          'x-real-ip': '203.0.113.1',
        },
        ip: '192.168.1.1',
        socket: { remoteAddress: '10.0.0.1' },
      } as any;

      expect(getClientIp(request)).toBe('203.0.113.1');
    });

    it('should fallback to request.ip', () => {
      const request = {
        headers: {},
        ip: '192.168.1.1',
        socket: { remoteAddress: '10.0.0.1' },
      } as any;

      expect(getClientIp(request)).toBe('192.168.1.1');
    });

    it('should fallback to socket.remoteAddress', () => {
      const request = {
        headers: {},
        socket: { remoteAddress: '10.0.0.1' },
      } as any;

      expect(getClientIp(request)).toBe('10.0.0.1');
    });

    it('should return unknown if no IP found', () => {
      const request = {
        headers: {},
        socket: {},
      } as any;

      expect(getClientIp(request)).toBe('unknown');
    });
  });

  describe('isIpWhitelisted', () => {
    const whitelist = ['127.0.0.1', '::1', '192.168.'];

    it('should return true for exact match', () => {
      expect(isIpWhitelisted('127.0.0.1', whitelist)).toBe(true);
      expect(isIpWhitelisted('::1', whitelist)).toBe(true);
    });

    it('should return true for prefix match', () => {
      expect(isIpWhitelisted('192.168.1.1', whitelist)).toBe(true);
      expect(isIpWhitelisted('192.168.100.50', whitelist)).toBe(true);
    });

    it('should return false for non-matching IP', () => {
      expect(isIpWhitelisted('203.0.113.1', whitelist)).toBe(false);
      expect(isIpWhitelisted('10.0.0.1', whitelist)).toBe(false);
    });
  });

  describe('parseWhitelist', () => {
    it('should return default whitelist when no env provided', () => {
      const result = parseWhitelist();
      expect(result).toContain('127.0.0.1');
      expect(result).toContain('::1');
      expect(result).toContain('localhost');
    });

    it('should parse comma-separated IPs', () => {
      const result = parseWhitelist('10.0.0.1,192.168.1.1');
      expect(result).toContain('10.0.0.1');
      expect(result).toContain('192.168.1.1');
      expect(result).toContain('127.0.0.1'); // Still includes defaults
    });

    it('should trim whitespace', () => {
      const result = parseWhitelist('10.0.0.1 , 192.168.1.1 ');
      expect(result).toContain('10.0.0.1');
      expect(result).toContain('192.168.1.1');
    });

    it('should filter empty strings', () => {
      const result = parseWhitelist('10.0.0.1,,192.168.1.1');
      expect(result).toContain('10.0.0.1');
      expect(result).toContain('192.168.1.1');
    });
  });

  describe('calculateRetryAfter', () => {
    it('should convert milliseconds to seconds', () => {
      expect(calculateRetryAfter(60000)).toBe(60);
      expect(calculateRetryAfter(30000)).toBe(30);
      expect(calculateRetryAfter(1000)).toBe(1);
    });

    it('should round up', () => {
      expect(calculateRetryAfter(1500)).toBe(2);
      expect(calculateRetryAfter(59999)).toBe(60);
    });
  });

  describe('formatResetTime', () => {
    it('should return Unix timestamp', () => {
      const now = Date.now();
      const result = formatResetTime(60000);
      const expected = Math.ceil((now + 60000) / 1000);
      
      expect(result).toBeGreaterThanOrEqual(expected - 1);
      expect(result).toBeLessThanOrEqual(expected + 1);
    });
  });

  describe('isRequestAuthenticated', () => {
    it('should return true if user exists', () => {
      const request = { user: { id: '123' } };
      expect(isRequestAuthenticated(request)).toBe(true);
    });

    it('should return true if authorization header exists', () => {
      const request = { headers: { authorization: 'Bearer token' } };
      expect(isRequestAuthenticated(request)).toBe(true);
    });

    it('should return true if access_token cookie exists', () => {
      const request = { cookies: { access_token: 'token' } };
      expect(isRequestAuthenticated(request)).toBe(true);
    });

    it('should return false if not authenticated', () => {
      const request = { headers: {}, cookies: {} };
      expect(isRequestAuthenticated(request)).toBe(false);
    });
  });

  describe('getRateLimitKey', () => {
    it('should create key with endpoint and IP', () => {
      const key = getRateLimitKey('/api/test', '192.168.1.1');
      expect(key).toContain('throttler');
      expect(key).toContain('/api/test');
      expect(key).toContain('192.168.1.1');
    });

    it('should use userId if provided', () => {
      const key = getRateLimitKey('/api/test', '192.168.1.1', 'user123');
      expect(key).toContain('user123');
      expect(key).not.toContain('192.168.1.1');
    });

    it('should include timestamp bucket', () => {
      const key = getRateLimitKey('/api/test', '192.168.1.1');
      const parts = key.split(':');
      expect(parts.length).toBe(4);
      expect(parseInt(parts[3])).toBeGreaterThan(0);
    });
  });

  describe('parseRateLimit', () => {
    it('should parse valid number', () => {
      expect(parseRateLimit('100', 60)).toBe(100);
      expect(parseRateLimit('5', 60)).toBe(5);
    });

    it('should return default for undefined', () => {
      expect(parseRateLimit(undefined, 60)).toBe(60);
    });

    it('should return default for invalid number', () => {
      expect(parseRateLimit('invalid', 60)).toBe(60);
      expect(parseRateLimit('', 60)).toBe(60);
    });
  });

  describe('createRateLimitMessage', () => {
    it('should create message with seconds', () => {
      expect(createRateLimitMessage(60)).toBe(
        'Rate limit exceeded. Please try again in 60 seconds.',
      );
    });

    it('should handle singular second', () => {
      expect(createRateLimitMessage(1)).toBe(
        'Rate limit exceeded. Please try again in 1 second.',
      );
    });
  });

  describe('parseRateLimitHeaders', () => {
    it('should parse valid headers', () => {
      const headers = {
        'x-ratelimit-limit': '60',
        'x-ratelimit-remaining': '45',
        'x-ratelimit-reset': '1234567890',
        'retry-after': '30',
      };

      const result = parseRateLimitHeaders(headers);
      expect(result).toEqual({
        limit: 60,
        remaining: 45,
        reset: 1234567890,
        retryAfter: 30,
      });
    });

    it('should return null for missing headers', () => {
      const headers = {
        'x-ratelimit-limit': '60',
      };

      expect(parseRateLimitHeaders(headers)).toBeNull();
    });

    it('should handle missing retry-after', () => {
      const headers = {
        'x-ratelimit-limit': '60',
        'x-ratelimit-remaining': '45',
        'x-ratelimit-reset': '1234567890',
      };

      const result = parseRateLimitHeaders(headers);
      expect(result?.retryAfter).toBeUndefined();
    });
  });

  describe('isRateLimitWarning', () => {
    it('should return true when below threshold', () => {
      expect(isRateLimitWarning(5, 100, 0.1)).toBe(true);
      expect(isRateLimitWarning(1, 100, 0.1)).toBe(true);
    });

    it('should return false when above threshold', () => {
      expect(isRateLimitWarning(50, 100, 0.1)).toBe(false);
      expect(isRateLimitWarning(20, 100, 0.1)).toBe(false);
    });

    it('should use default threshold of 10%', () => {
      expect(isRateLimitWarning(5, 100)).toBe(true);
      expect(isRateLimitWarning(15, 100)).toBe(false);
    });
  });

  describe('formatRateLimitLog', () => {
    it('should format log message', () => {
      const result = formatRateLimitLog('/api/test', '192.168.1.1', 60, 45);
      expect(result).toContain('[Rate Limit]');
      expect(result).toContain('/api/test');
      expect(result).toContain('192.168.1.1');
      expect(result).toContain('45/60');
    });
  });
});
