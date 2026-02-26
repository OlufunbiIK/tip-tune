import { THROTTLE_PRESETS, ThrottleOverride, CustomThrottle, SkipThrottle, THROTTLE_AUTH_AWARE, ThrottleAuthAware } from './throttle-override.decorator';

describe('Throttle Decorators', () => {
  describe('THROTTLE_PRESETS', () => {
    it('should have correct PUBLIC preset', () => {
      expect(THROTTLE_PRESETS.PUBLIC).toEqual({
        limit: 60,
        ttl: 60000,
      });
    });

    it('should have correct AUTHENTICATED preset', () => {
      expect(THROTTLE_PRESETS.AUTHENTICATED).toEqual({
        limit: 300,
        ttl: 60000,
      });
    });

    it('should have correct AUTH_ENDPOINTS preset', () => {
      expect(THROTTLE_PRESETS.AUTH_ENDPOINTS).toEqual({
        limit: 10,
        ttl: 60000,
      });
    });

    it('should have correct TIP_SUBMISSION preset', () => {
      expect(THROTTLE_PRESETS.TIP_SUBMISSION).toEqual({
        limit: 30,
        ttl: 60000,
      });
    });

    it('should have correct SEARCH preset', () => {
      expect(THROTTLE_PRESETS.SEARCH).toEqual({
        limit: 100,
        ttl: 60000,
      });
    });

    it('should have correct FILE_UPLOAD preset', () => {
      expect(THROTTLE_PRESETS.FILE_UPLOAD).toEqual({
        limit: 5,
        ttl: 60000,
      });
    });

    it('should have correct STRICT preset', () => {
      expect(THROTTLE_PRESETS.STRICT).toEqual({
        limit: 5,
        ttl: 60000,
      });
    });

    it('should have correct RELAXED preset', () => {
      expect(THROTTLE_PRESETS.RELAXED).toEqual({
        limit: 1000,
        ttl: 60000,
      });
    });
  });

  describe('ThrottleOverride', () => {
    it('should be a function', () => {
      expect(typeof ThrottleOverride).toBe('function');
    });

    it('should return a decorator', () => {
      const decorator = ThrottleOverride('PUBLIC');
      expect(typeof decorator).toBe('function');
    });

    it('should accept valid preset names', () => {
      expect(() => ThrottleOverride('PUBLIC')).not.toThrow();
      expect(() => ThrottleOverride('AUTHENTICATED')).not.toThrow();
      expect(() => ThrottleOverride('AUTH_ENDPOINTS')).not.toThrow();
      expect(() => ThrottleOverride('TIP_SUBMISSION')).not.toThrow();
      expect(() => ThrottleOverride('SEARCH')).not.toThrow();
      expect(() => ThrottleOverride('FILE_UPLOAD')).not.toThrow();
    });
  });

  describe('CustomThrottle', () => {
    it('should be a function', () => {
      expect(typeof CustomThrottle).toBe('function');
    });

    it('should return a decorator', () => {
      const decorator = CustomThrottle(50, 60000);
      expect(typeof decorator).toBe('function');
    });

    it('should accept custom limit and ttl', () => {
      expect(() => CustomThrottle(100, 30000)).not.toThrow();
      expect(() => CustomThrottle(1, 1000)).not.toThrow();
      expect(() => CustomThrottle(1000, 120000)).not.toThrow();
    });
  });

  describe('SkipThrottle', () => {
    it('should be a function', () => {
      expect(typeof SkipThrottle).toBe('function');
    });

    it('should return a decorator', () => {
      const decorator = SkipThrottle();
      expect(typeof decorator).toBe('function');
    });
  });

  describe('ThrottleAuthAware', () => {
    it('should be a function', () => {
      expect(typeof ThrottleAuthAware).toBe('function');
    });

    it('should return a decorator', () => {
      const decorator = ThrottleAuthAware();
      expect(typeof decorator).toBe('function');
    });

    it('should use correct metadata key', () => {
      expect(THROTTLE_AUTH_AWARE).toBe('throttle:auth-aware');
    });
  });

  describe('Preset Values', () => {
    it('should have all presets with 60 second TTL', () => {
      Object.values(THROTTLE_PRESETS).forEach((preset) => {
        expect(preset.ttl).toBe(60000);
      });
    });

    it('should have increasing limits from strict to relaxed', () => {
      expect(THROTTLE_PRESETS.STRICT.limit).toBeLessThan(THROTTLE_PRESETS.AUTH_ENDPOINTS.limit);
      expect(THROTTLE_PRESETS.AUTH_ENDPOINTS.limit).toBeLessThan(THROTTLE_PRESETS.TIP_SUBMISSION.limit);
      expect(THROTTLE_PRESETS.TIP_SUBMISSION.limit).toBeLessThan(THROTTLE_PRESETS.PUBLIC.limit);
      expect(THROTTLE_PRESETS.PUBLIC.limit).toBeLessThan(THROTTLE_PRESETS.SEARCH.limit);
      expect(THROTTLE_PRESETS.SEARCH.limit).toBeLessThan(THROTTLE_PRESETS.AUTHENTICATED.limit);
      expect(THROTTLE_PRESETS.AUTHENTICATED.limit).toBeLessThan(THROTTLE_PRESETS.RELAXED.limit);
    });

    it('should have FILE_UPLOAD as most restrictive', () => {
      const limits = Object.values(THROTTLE_PRESETS).map(p => p.limit);
      const minLimit = Math.min(...limits);
      expect(THROTTLE_PRESETS.FILE_UPLOAD.limit).toBe(minLimit);
    });

    it('should have RELAXED as least restrictive', () => {
      const limits = Object.values(THROTTLE_PRESETS).map(p => p.limit);
      const maxLimit = Math.max(...limits);
      expect(THROTTLE_PRESETS.RELAXED.limit).toBe(maxLimit);
    });
  });
});
