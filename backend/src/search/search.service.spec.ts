import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SearchService } from './search.service';
import { Artist } from '../artists/entities/artist.entity';
import { Track } from '../tracks/entities/track.entity';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchSuggestionsQueryDto } from './dto/search-suggestions-query.dto';
import { ArtistStatus } from '../artists/entities/artist.entity';

function createMockQueryBuilder(getManyAndCountResult: [any[], number]) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue(getManyAndCountResult),
    getMany: jest.fn().mockResolvedValue(getManyAndCountResult[0]),
  };
  return chain;
}

describe('SearchService', () => {
  let service: SearchService;
  let artistRepo: Repository<Artist>;
  let trackRepo: Repository<Track>;

  const mockArtist: Partial<Artist> = {
    id: 'artist-1',
    artistName: 'Test Artist',
    genre: 'rock',
    bio: 'A rock band',
    userId: 'user-1',
    walletAddress: 'GXXX',
    totalTipsReceived: '0',
    emailNotifications: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTrack: Partial<Track> = {
    id: 'track-1',
    title: 'Test Track',
    genre: 'rock',
    description: 'A great track',
    artistId: 'artist-1',
    isPublic: true,
    plays: 10,
    tipCount: 2,
    totalTips: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const qbArtist = createMockQueryBuilder([[mockArtist], 1]);
    const qbTrack = createMockQueryBuilder([[mockTrack], 1]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: getRepositoryToken(Artist),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(qbArtist),
          },
        },
        {
          provide: getRepositoryToken(Track),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(qbTrack),
          },
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    artistRepo = module.get<Repository<Artist>>(getRepositoryToken(Artist));
    trackRepo = module.get<Repository<Track>>(getRepositoryToken(Track));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('search', () => {
    it('should return both artists and tracks when type is omitted', async () => {
      const dto: SearchQueryDto = { q: 'rock', page: 1, limit: 10 };
      const result = await service.search(dto);
      expect(result.artists).toBeDefined();
      expect(result.tracks).toBeDefined();
      expect(result.artists!.data).toHaveLength(1);
      expect(result.tracks!.data).toHaveLength(1);
      expect(result.artists!.total).toBe(1);
      expect(result.tracks!.total).toBe(1);
      expect(result.artists!.page).toBe(1);
      expect(result.artists!.limit).toBe(10);
      expect(result.artists!.totalPages).toBe(1);
    });

    it('should return only artists when type=artist', async () => {
      const dto: SearchQueryDto = { q: 'rock', type: 'artist', page: 1, limit: 10 };
      const result = await service.search(dto);
      expect(result.artists).toBeDefined();
      expect(result.tracks).toBeUndefined();
      expect(result.artists!.data).toHaveLength(1);
    });

    it('should return only tracks when type=track', async () => {
      const dto: SearchQueryDto = { q: 'rock', type: 'track', page: 1, limit: 10 };
      const result = await service.search(dto);
      expect(result.tracks).toBeDefined();
      expect(result.artists).toBeUndefined();
      expect(result.tracks!.data).toHaveLength(1);
    });

    it('should apply pagination', async () => {
      const qb = createMockQueryBuilder([[], 0]);
      jest.spyOn(artistRepo, 'createQueryBuilder').mockReturnValue(qb as any);
      jest.spyOn(trackRepo, 'createQueryBuilder').mockReturnValue(qb as any);

      const dto: SearchQueryDto = { q: 'xyz', page: 2, limit: 5 };
      await service.search(dto);

      expect(qb.skip).toHaveBeenCalledWith(5);
      expect(qb.take).toHaveBeenCalledWith(5);
    });

    it('should support sort=recent', async () => {
      const qb = createMockQueryBuilder([[mockArtist], 1]);
      jest.spyOn(artistRepo, 'createQueryBuilder').mockReturnValue(qb as any);
      jest.spyOn(trackRepo, 'createQueryBuilder').mockReturnValue(qb as any);

      const dto: SearchQueryDto = { q: 'rock', sort: 'recent' };
      await service.search(dto);

      expect(qb.orderBy).toHaveBeenCalledWith('artist.createdAt', 'DESC');
    });

    it('should support sort=popular and genre filter for tracks', async () => {
      const qb = createMockQueryBuilder([[mockTrack], 1]);
      jest.spyOn(trackRepo, 'createQueryBuilder').mockReturnValue(qb as any);
      jest.spyOn(artistRepo, 'createQueryBuilder').mockReturnValue(
        createMockQueryBuilder([[], 0]) as any,
      );

      const dto: SearchQueryDto = {
        q: 'rock',
        type: 'track',
        sort: 'popular',
        genre: 'pop',
      };
      await service.search(dto);

      expect(qb.orderBy).toHaveBeenCalledWith('track.tipCount', 'DESC');
      expect(qb.addOrderBy).toHaveBeenCalledWith('track.totalTips', 'DESC');
      expect(qb.andWhere).toHaveBeenCalledWith(
        'track.genre ILIKE :genre',
        expect.objectContaining({ genre: expect.any(String) }),
      );
    });

    it('should apply artist status/location/verification filters composably', async () => {
      const qb = createMockQueryBuilder([[mockArtist], 1]);
      jest.spyOn(artistRepo, 'createQueryBuilder').mockReturnValue(qb as any);
      jest.spyOn(trackRepo, 'createQueryBuilder').mockReturnValue(
        createMockQueryBuilder([[], 0]) as any,
      );

      const dto: SearchQueryDto = {
        type: 'artist',
        status: ArtistStatus.ACCEPTING_REQUESTS,
        country: 'NG',
        city: 'Lagos',
        hasLocation: true,
        isVerified: true,
      };

      await service.search(dto);

      expect(qb.andWhere).toHaveBeenCalledWith('artist.status = :status', {
        status: ArtistStatus.ACCEPTING_REQUESTS,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('UPPER(artist.country) = UPPER(:country)', {
        country: 'NG',
      });
      expect(qb.andWhere).toHaveBeenCalledWith('artist.city ILIKE :city', {
        city: '%Lagos%',
      });
      expect(qb.andWhere).toHaveBeenCalledWith('artist.hasLocation = :hasLocation', {
        hasLocation: true,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('artist.isVerified = :isVerified', {
        isVerified: true,
      });
    });
  });

  describe('getSuggestions', () => {
    it('should return artists and tracks for partial query', async () => {
      const dto: SearchSuggestionsQueryDto = { q: 'roc', limit: 10 };
      const result = await service.getSuggestions(dto);
      expect(result.artists).toBeDefined();
      expect(result.tracks).toBeDefined();
      expect(Array.isArray(result.artists)).toBe(true);
      expect(Array.isArray(result.tracks)).toBe(true);
    });

    it('should return empty arrays when q is too short', async () => {
      const dto: SearchSuggestionsQueryDto = { q: 'r' };
      const result = await service.getSuggestions(dto);
      expect(result.artists).toEqual([]);
      expect(result.tracks).toEqual([]);
    });

    it('should return empty arrays when q is empty after sanitize', async () => {
      const dto: SearchSuggestionsQueryDto = { q: '   ' };
      const result = await service.getSuggestions(dto);
      expect(result.artists).toEqual([]);
      expect(result.tracks).toEqual([]);
    });

    it('should limit to artists when type=artist', async () => {
      const qb = createMockQueryBuilder([[mockArtist], 1]);
      jest.spyOn(artistRepo, 'createQueryBuilder').mockReturnValue(qb as any);

      const dto: SearchSuggestionsQueryDto = { q: 'test', type: 'artist', limit: 5 };
      const result = await service.getSuggestions(dto);
      expect(result.artists.length).toBeGreaterThanOrEqual(0);
      expect(result.tracks).toEqual([]);
      expect(qb.take).toHaveBeenCalledWith(5);
    });
  });
});
