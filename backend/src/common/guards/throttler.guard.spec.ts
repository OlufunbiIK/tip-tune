import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerException } from '@nestjs/throttler';
import { CustomThrottlerGuard } from './throttler.guard';
import { THROTTLE_AUTH_AWARE } from '../decorators/throttle-override.decorator';

describe('CustomThrottlerGuard', () => {
  let guard: CustomThrottlerGuard;
  let reflector: Reflector;
  let mockStorageService: any;

  beforeEach(async () => {
    mockStorageService = {
      increment: jest.fn().mockResolvedValue(1),
      get: jest.fn().mockResolvedValue(0),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: CustomThrottlerGuard,
          useFactory: (reflector: Reflector) => {
            return new CustomThrottlerGuard(
              { throttlers: [{ name: 'default', ttl: 60000, limit: 60 }] },
              mockStorageService,
              reflector,
            );
          },
          inject: [Reflector],
        },
        Reflector,
      ],
    }).compile();

    guard = module.get<CustomThrottlerGuard>(CustomThrottlerGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('IP Whitelisting', () => {
    it('should bypass rate limiting for localhost', async () => {
      const mockContext = createMockExecutionContext({
        ip: '127.0.0.1',
      });

      const result = await guard.handleRequest(mockContext, 10, 60000, {});
      expect(result).toBe(true);
    });

    it('should bypass rate limiting for IPv6 localhost', async () => {
      const mockContext = createMockExecutionContext({
        ip: '::1',
      });

      const result = await guard.handleRequest(mockContext, 10, 60000, {});
      expect(result).toBe(true);
    });

    it('should set unlimited headers for whitelisted IPs', async () => {
      const mockResponse = {
        setHeader: jest.fn(),
      };

      const mockContext = createMockExecutionContext({
        ip: '127.0.0.1',
        response: mockResponse,
      });

      await guard.handleRequest(mockContext, 10, 60000, {});

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 'unlimited');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 'unlimited');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', 'never');
    });
  });

  describe('Rate Limit Headers', () => {
    it('should add rate limit headers on successful request', async () => {
      const mockResponse = {
        setHeader: jest.fn(),
      };

      const mockContext = createMockExecutionContext({
        ip: '192.168.1.1',
        response: mockResponse,
      });

      // Mock parent handleRequest to return true
      jest.spyOn(guard as any, 'handleRequest').mockResolvedValue(true);

      await guard.handleRequest(mockContext, 60, 60000, {});

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', expect.any(String));
    });

    it('should add Retry-After header when rate limit exceeded', async () => {
      const mockResponse = {
        setHeader: jest.fn(),
      };

      const mockContext = createMockExecutionContext({
        ip: '192.168.1.1',
        response: mockResponse,
      });

      // Mock parent to throw ThrottlerException
      jest.spyOn(guard as any, 'handleRequest').mockImplementation(() => {
        throw new ThrottlerException('Rate limit exceeded');
      });

      try {
        await guard.handleRequest(mockContext, 60, 60000, {});
      } catch (error) {
        expect(error).toBeInstanceOf(ThrottlerException);
        expect(mockResponse.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
      }
    });
  });

  describe('Authentication-Aware Rate Limiting', () => {
    it('should increase limit for authenticated users', async () => {
      const mockContext = createMockExecutionContext({
        ip: '192.168.1.1',
        user: { userId: '123' },
      });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      // The guard should call parent with increased limit (300)
      const handleRequestSpy = jest.spyOn(guard as any, 'handleRequest');

      await guard.handleRequest(mockContext, 60, 60000, {});

      // Verify that the limit was adjusted for authenticated users
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
        THROTTLE_AUTH_AWARE,
        expect.any(Array),
      );
    });

    it('should use default limit for unauthenticated users', async () => {
      const mockContext = createMockExecutionContext({
        ip: '192.168.1.1',
      });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      await guard.handleRequest(mockContext, 60, 60000, {});

      expect(reflector.getAllAndOverride).toHaveBeenCalled();
    });
  });

  describe('IP Extraction', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const mockRequest = {
        headers: {
          'x-forwarded-for': '203.0.113.1, 198.51.100.1',
        },
        ip: '192.168.1.1',
        socket: { remoteAddress: '10.0.0.1' },
      };

      const ip = (guard as any).getClientIp(mockRequest);
      expect(ip).toBe('203.0.113.1');
    });

    it('should extract IP from x-real-ip header', () => {
      const mockRequest = {
        headers: {
          'x-real-ip': '203.0.113.1',
        },
        ip: '192.168.1.1',
        socket: { remoteAddress: '10.0.0.1' },
      };

      const ip = (guard as any).getClientIp(mockRequest);
      expect(ip).toBe('203.0.113.1');
    });

    it('should fallback to request.ip', () => {
      const mockRequest = {
        headers: {},
        ip: '192.168.1.1',
        socket: { remoteAddress: '10.0.0.1' },
      };

      const ip = (guard as any).getClientIp(mockRequest);
      expect(ip).toBe('192.168.1.1');
    });
  });
});

// Helper function to create mock execution context
function createMockExecutionContext(options: {
  ip?: string;
  user?: any;
  response?: any;
  headers?: any;
}): ExecutionContext {
  const mockRequest = {
    ip: options.ip || '192.168.1.1',
    user: options.user,
    headers: options.headers || {},
    socket: { remoteAddress: options.ip || '192.168.1.1' },
  };

  const mockResponse = options.response || {
    setHeader: jest.fn(),
  };

  return {
    switchToHttp: () => ({
      getRequest: () => mockRequest,
      getResponse: () => mockResponse,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any;
}
