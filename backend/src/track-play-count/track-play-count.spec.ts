import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TrackPlayCountService } from './track-play-count.service';
import { TrackPlay, PlaySource } from './entities/track-play.entity';

const mockRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue({
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(0),
    getRawOne: jest.fn().mockResolvedValue({}),
    getRawMany: jest.fn().mockResolvedValue([]),
  }),
  manager: {
    createQueryBuilder: jest.fn().mockReturnValue({
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({}),
    }),
  },
});

describe('TrackPlayCountService', () => {
  let service: TrackPlayCountService;
  let repo: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackPlayCountService,
        { provide: getRepositoryToken(TrackPlay), useFactory: mockRepo },
      ],
    }).compile();

    service = module.get<TrackPlayCountService>(TrackPlayCountService);
    repo = module.get(getRepositoryToken(TrackPlay));
  });

  it('should NOT count play under 30 seconds', async () => {
    repo.create.mockReturnValue({});
    repo.save.mockResolvedValue({});

    const result = await service.recordPlay(
      { trackId: 'track-1', listenDuration: 20, completedFull: false, source: PlaySource.DIRECT },
      null,
      '127.0.0.1',
    );

    expect(result.counted).toBe(false);
    expect(result.reason).toContain('30 seconds');
  });

  it('should count play at exactly 30 seconds', async () => {
    repo.create.mockReturnValue({});
    repo.save.mockResolvedValue({});

    const result = await service.recordPlay(
      { trackId: 'track-1', listenDuration: 30, completedFull: false, source: PlaySource.DIRECT },
      null,
      '127.0.0.1',
    );

    expect(result.counted).toBe(true);
  });

  it('should NOT count duplicate play within 1 hour', async () => {
    // First play — no duplicate
    repo.create.mockReturnValue({});
    repo.save.mockResolvedValue({});

    // Second play — duplicate found
    repo.createQueryBuilder().getCount.mockResolvedValue(1);

    const result = await service.recordPlay(
      { trackId: 'track-1', listenDuration: 60, completedFull: true, source: PlaySource.DIRECT },
      'user-1',
      '127.0.0.1',
    );

    expect(result.counted).toBe(false);
    expect(result.reason).toContain('Duplicate');
  });

  it('should count plays from different sources independently', async () => {
    repo.create.mockReturnValue({});
    repo.save.mockResolvedValue({});
    repo.createQueryBuilder().getCount.mockResolvedValue(0);

    const result = await service.recordPlay(
      { trackId: 'track-1', listenDuration: 45, completedFull: false, source: PlaySource.SEARCH },
      'user-2',
      '127.0.0.2',
    );

    expect(result.counted).toBe(true);
  });
});