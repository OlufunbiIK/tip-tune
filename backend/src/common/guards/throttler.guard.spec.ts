import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { CustomThrottlerGuard } from './throttler.guard';

describe('CustomThrottlerGuard', () => {
  let guard: CustomThrottlerGuard;
  let mockStorageService: { increment: jest.Mock; get: jest.Mock };

  beforeEach(async () => {
    mockStorageService = {
      increment: jest.fn().mockResolvedValue(1),
      get: jest.fn().mockResolvedValue(0),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: CustomThrottlerGuard,
          useFactory: (reflector: Reflector) =>
            new CustomThrottlerGuard(
              { throttlers: [{ name: 'default', ttl: 60000, limit: 60 }] },
              mockStorageService,
              reflector,
            ),
          inject: [Reflector],
        },
        Reflector,
      ],
    }).compile();

    guard = module.get<CustomThrottlerGuard>(CustomThrottlerGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('getClientIp', () => {
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
