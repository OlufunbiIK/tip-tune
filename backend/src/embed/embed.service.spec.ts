import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EmbedService } from './embed.service';
import { EmbedView } from './entities/embed-view.entity';

describe('EmbedService', () => {
  let service: EmbedService;
  const mockRepo = {
    save: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmbedService,
        {
          provide: getRepositoryToken(EmbedView),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<EmbedService>(EmbedService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('generateEmbedToken', () => {
    it('should return a hex string', () => {
      const token = service.generateEmbedToken('track-123');
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should generate different tokens for different tracks', () => {
      const t1 = service.generateEmbedToken('track-1');
      const t2 = service.generateEmbedToken('track-2');
      expect(t1).not.toBe(t2);
    });
  });

  describe('getOEmbed', () => {
    it('should return valid oEmbed JSON spec', () => {
      const result = service.getOEmbed('track-123', 'https://example.com');
      expect(result).toHaveProperty('type', 'rich');
      expect(result).toHaveProperty('version', '1.0');
      expect(result).toHaveProperty('provider_name');
      expect(result).toHaveProperty('html');
    });
  });

  describe('getMetaTags', () => {
    it('should include Open Graph tags', () => {
      const result = service.getMetaTags('track-123', 'https://example.com');
      expect(result).toHaveProperty('og:type');
      expect(result).toHaveProperty('og:title');
      expect(result).toHaveProperty('og:url');
    });

    it('should include Twitter Card tags', () => {
      const result = service.getMetaTags('track-123', 'https://example.com');
      expect(result).toHaveProperty('twitter:card');
    });
  });

  describe('recordView', () => {
    it('should save an embed view record', async () => {
      mockRepo.save.mockResolvedValue({ id: '1' });

      await service.recordView('track-123', 'https://blog.com/post', 'blog.com');

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          trackId: 'track-123',
          referrerDomain: 'blog.com',
        }),
      );
    });
  });

  describe('getPlayerData', () => {
    it('should reject invalid tokens', () => {
      expect(() =>
        service.getPlayerData('track-123', 'invalid-token'),
      ).toThrow();
    });
  });
});
