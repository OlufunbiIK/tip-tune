import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SmartPlaylistsService } from './smart-playlists.service';
import { Playlist } from './entities/playlist.entity';
import { SmartPlaylist } from './entities/smart-playlist.entity';
import { PlaylistTrack } from './entities/playlist-track.entity';
import { Track } from '../tracks/entities/track.entity';
import { PlaylistCollaborator } from './entities/playlist-collaborator.entity';
import { Follow, FollowingType } from '../follows/entities/follow.entity';
import { ActivitiesService } from '../activities/activities.service';
import { ActivityType } from '../activities/entities/activity.entity';

describe('SmartPlaylistsService', () => {
  let service: SmartPlaylistsService;

  const playlistRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const smartPlaylistRepository = {
    save: jest.fn(),
    find: jest.fn(),
  };

  const playlistTrackRepository = {
    find: jest.fn(),
    save: jest.fn(),
    manager: {
      transaction: jest.fn(),
    },
  };

  const trackRepository = {
    createQueryBuilder: jest.fn(),
  };

  const collaboratorRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const followRepository = {
    find: jest.fn(),
  };

  const activitiesService = {
    create: jest.fn(),
  };

  const createQueryBuilder = (tracks: Track[]) => {
    const builder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(tracks),
    };
    return builder;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmartPlaylistsService,
        { provide: getRepositoryToken(Playlist), useValue: playlistRepository },
        { provide: getRepositoryToken(SmartPlaylist), useValue: smartPlaylistRepository },
        { provide: getRepositoryToken(PlaylistTrack), useValue: playlistTrackRepository },
        { provide: getRepositoryToken(Track), useValue: trackRepository },
        { provide: getRepositoryToken(PlaylistCollaborator), useValue: collaboratorRepository },
        { provide: getRepositoryToken(Follow), useValue: followRepository },
        { provide: ActivitiesService, useValue: activitiesService },
      ],
    }).compile();

    service = module.get<SmartPlaylistsService>(SmartPlaylistsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('builds genre criteria queries for preview', async () => {
    const builder = createQueryBuilder([]);
    trackRepository.createQueryBuilder.mockReturnValue(builder);

    await service.previewTracks('user-1', {
      type: 'genre',
      genres: ['lofi'],
      limit: 10,
    });

    expect(builder.andWhere).toHaveBeenCalledWith(
      'track.genre IN (:...genres)',
      { genres: ['lofi'] },
    );
  });

  it('orders most tipped criteria by total tips', async () => {
    const builder = createQueryBuilder([]);
    trackRepository.createQueryBuilder.mockReturnValue(builder);

    await service.previewTracks('user-1', {
      type: 'most_tipped',
      limit: 5,
    });

    expect(builder.orderBy).toHaveBeenCalledWith('track.totalTips', 'DESC');
  });

  it('returns empty preview for followed artists when no follows exist', async () => {
    const builder = createQueryBuilder([]);
    trackRepository.createQueryBuilder.mockReturnValue(builder);
    followRepository.find.mockResolvedValue([]);

    const result = await service.previewTracks('user-1', {
      type: 'followed_artists_latest',
      limit: 5,
    });

    expect(result).toEqual([]);
  });

  it('skips refresh when smart playlist results are unchanged', async () => {
    const playlist = { id: 'playlist-1', userId: 'user-1' } as Playlist;
    playlistRepository.findOne.mockResolvedValue(playlist);

    const builder = createQueryBuilder([{ id: 'track-1', duration: 120 } as Track]);
    trackRepository.createQueryBuilder.mockReturnValue(builder);

    playlistTrackRepository.find.mockResolvedValue([
      { trackId: 'track-1', position: 0 } as PlaylistTrack,
    ]);

    await service.refreshSmartPlaylist({
      id: 'smart-1',
      playlistId: 'playlist-1',
      criteria: { type: 'most_tipped', limit: 10 },
      autoUpdate: true,
    } as SmartPlaylist);

    expect(playlistTrackRepository.manager.transaction).not.toHaveBeenCalled();
    expect(activitiesService.create).not.toHaveBeenCalled();
  });

  it('refreshes smart playlist when results change', async () => {
    const playlist = { id: 'playlist-1', userId: 'user-1' } as Playlist;
    playlistRepository.findOne.mockResolvedValue(playlist);

    const builder = createQueryBuilder([
      { id: 'track-1', duration: 120 } as Track,
      { id: 'track-2', duration: 140 } as Track,
    ]);
    trackRepository.createQueryBuilder.mockReturnValue(builder);

    playlistTrackRepository.find.mockResolvedValue([
      { trackId: 'track-1', position: 0 } as PlaylistTrack,
    ]);

    const manager = {
      delete: jest.fn(),
      create: jest.fn((_entity, data) => data),
      save: jest.fn(),
    };

    playlistTrackRepository.manager.transaction.mockImplementation(async (cb) => cb(manager));

    await service.refreshSmartPlaylist({
      id: 'smart-1',
      playlistId: 'playlist-1',
      criteria: { type: 'most_tipped', limit: 10 },
      autoUpdate: true,
    } as SmartPlaylist);

    expect(manager.delete).toHaveBeenCalled();
    expect(manager.save).toHaveBeenCalled();
    expect(activitiesService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        activityType: ActivityType.SMART_PLAYLIST_REFRESHED,
      }),
    );
  });
});
