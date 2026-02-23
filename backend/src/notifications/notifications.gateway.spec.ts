
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsGateway } from './notifications.gateway';
import { AuthService } from '../auth/auth.service';
import { Socket } from 'socket.io';

describe('NotificationsGateway', () => {
  let gateway: NotificationsGateway;
  let authService: AuthService;

  const mockAuthService = {
    verifyAccessToken: jest.fn(),
  };

  const mockClient = {
    id: 'client-123',
    handshake: {
      auth: {
        token: 'valid-token',
      },
      headers: {},
    },
    join: jest.fn(),
    disconnect: jest.fn(),
    data: {},
    emit: jest.fn(),
  } as unknown as Socket;

  const mockServer = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsGateway,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    gateway = module.get<NotificationsGateway>(NotificationsGateway);
    gateway.server = mockServer as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('should authenticate user and join user room', async () => {
      const user = { id: 'user-1', walletAddress: 'test-wallet' };
      mockAuthService.verifyAccessToken.mockResolvedValue(user);

      await gateway.handleConnection(mockClient);

      expect(mockAuthService.verifyAccessToken).toHaveBeenCalledWith('valid-token');
      expect(mockClient.join).toHaveBeenCalledWith('user:user-1');
      expect(mockClient.data.user).toEqual(user);
    });

    it('should disconnect if no token provided', async () => {
      const noTokenClient = {
        ...mockClient,
        handshake: { auth: {}, headers: {} },
      } as unknown as Socket;

      await gateway.handleConnection(noTokenClient);

      expect(noTokenClient.disconnect).toHaveBeenCalled();
      expect(mockAuthService.verifyAccessToken).not.toHaveBeenCalled();
    });

    it('should disconnect if authentication fails', async () => {
      mockAuthService.verifyAccessToken.mockRejectedValue(new Error('Invalid token'));

      await gateway.handleConnection(mockClient);

      expect(mockClient.disconnect).toHaveBeenCalled();
    });
  });

  describe('sendNotificationToArtist', () => {
    it('should emit tipReceived event to user room', () => {
      const artistId = 'artist-1';
      const payload = { amount: 100 };

      gateway.sendNotificationToArtist(artistId, payload);

      expect(mockServer.to).toHaveBeenCalledWith(`user:${artistId}`);
      expect(mockServer.emit).toHaveBeenCalledWith('tipReceived', payload);
    });
  });
});
