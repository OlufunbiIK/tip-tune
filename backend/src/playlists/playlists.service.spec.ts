import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { PlaylistsService } from './playlists.service';
import { Playlist } from './entities/playlist.entity';
import { PlaylistTrack } from './entities/playlist-track.entity';
import { Track } from '../tracks/entities/track.entity';
import {
  PlaylistCollaborator,
  PlaylistCollaboratorRole,
  PlaylistCollaboratorStatus,
} from './entities/playlist-collaborator.entity';
import {
  PlaylistChangeAction,
  PlaylistChangeRequest,
  PlaylistChangeStatus,
} from './entities/playlist-change-request.entity';
import { SmartPlaylist } from './entities/smart-playlist.entity';
import { ActivitiesService } from '../activities/activities.service';
import { UsersService } from '../users/users.service';
import { ActivityType } from '../activities/entities/activity.entity';

describe('PlaylistsService', () => {
  let service: PlaylistsService;
  let activitiesService: ActivitiesService;

  const playlistRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const playlistTrackRepository = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const collaboratorRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const changeRequestRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const smartPlaylistRepository = {
    findOne: jest.fn(),
  };

  const trackRepository = {
    findOne: jest.fn(),
  };

  const mockActivitiesService = {
    create: jest.fn(),
  };

  const mockUsersService = {
    findByUsername: jest.fn(),
    findByEmail: jest.fn(),
  };

  const mockQueryBuilder = {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({}),
    select: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue({ max: null }),
  };

  beforeEach(async () => {
    playlistTrackRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlaylistsService,
        {
          provide: getRepositoryToken(Playlist),
          useValue: playlistRepository,
        },
        {
          provide: getRepositoryToken(PlaylistTrack),
          useValue: playlistTrackRepository,
        },
        {
          provide: getRepositoryToken(PlaylistCollaborator),
          useValue: collaboratorRepository,
        },
        {
          provide: getRepositoryToken(PlaylistChangeRequest),
          useValue: changeRequestRepository,
        },
        {
          provide: getRepositoryToken(SmartPlaylist),
          useValue: smartPlaylistRepository,
        },
        {
          provide: getRepositoryToken(Track),
          useValue: trackRepository,
        },
        {
          provide: ActivitiesService,
          useValue: mockActivitiesService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    service = module.get<PlaylistsService>(PlaylistsService);
    activitiesService = module.get<ActivitiesService>(ActivitiesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates a change request when approval is required for an editor', async () => {
    const playlist = {
      id: 'playlist-1',
      userId: 'owner-1',
      approvalRequired: true,
      smartPlaylist: null,
    } as Playlist;

    playlistRepository.findOne.mockResolvedValue(playlist);
    collaboratorRepository.findOne.mockResolvedValue({
      role: PlaylistCollaboratorRole.EDITOR,
      status: PlaylistCollaboratorStatus.ACCEPTED,
    });
    trackRepository.findOne.mockResolvedValue({
      id: 'track-1',
      title: 'Track 1',
    });
    playlistTrackRepository.findOne.mockResolvedValue(null);

    const changeRequest = {
      id: 'change-1',
      playlistId: 'playlist-1',
      requestedById: 'editor-1',
      action: PlaylistChangeAction.ADD_TRACK,
      status: PlaylistChangeStatus.PENDING,
      payload: { trackId: 'track-1' },
    } as PlaylistChangeRequest;

    changeRequestRepository.create.mockReturnValue(changeRequest);
    changeRequestRepository.save.mockResolvedValue(changeRequest);

    const result = await service.addTrack('playlist-1', 'editor-1', {
      trackId: 'track-1',
    });

    expect(result).toEqual(changeRequest);
    expect(changeRequestRepository.save).toHaveBeenCalled();
    expect(playlistTrackRepository.save).not.toHaveBeenCalled();
  });

  it('prevents viewers from adding tracks', async () => {
    const playlist = {
      id: 'playlist-1',
      userId: 'owner-1',
      approvalRequired: false,
      smartPlaylist: null,
    } as Playlist;

    playlistRepository.findOne.mockResolvedValue(playlist);
    collaboratorRepository.findOne.mockResolvedValue({
      role: PlaylistCollaboratorRole.VIEWER,
      status: PlaylistCollaboratorStatus.ACCEPTED,
    });

    await expect(
      service.addTrack('playlist-1', 'viewer-1', {
        trackId: 'track-1',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('logs activity when a track is added directly', async () => {
    const playlist = {
      id: 'playlist-1',
      userId: 'owner-1',
      approvalRequired: false,
      trackCount: 0,
      totalDuration: 0,
      smartPlaylist: null,
    } as Playlist;

    playlistRepository.findOne.mockResolvedValue(playlist);
    trackRepository.findOne.mockResolvedValue({
      id: 'track-1',
      title: 'Track 1',
      duration: 120,
    });
    playlistTrackRepository.findOne.mockResolvedValue(null);
    playlistTrackRepository.create.mockReturnValue({
      playlistId: playlist.id,
      trackId: 'track-1',
    });
    playlistTrackRepository.save.mockResolvedValue({});
    playlistRepository.save.mockResolvedValue(playlist);

    await service.addTrack('playlist-1', 'owner-1', { trackId: 'track-1' });

    expect(activitiesService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        activityType: ActivityType.PLAYLIST_TRACK_ADDED,
      }),
    );
  });

  it('invites collaborators as owner', async () => {
    const playlist = {
      id: 'playlist-1',
      userId: 'owner-1',
      smartPlaylist: null,
    } as Playlist;

    playlistRepository.findOne.mockResolvedValue(playlist);
    mockUsersService.findByUsername.mockResolvedValue({
      id: 'user-2',
    });
    collaboratorRepository.findOne.mockResolvedValue(null);
    collaboratorRepository.create.mockReturnValue({
      playlistId: 'playlist-1',
      userId: 'user-2',
      role: PlaylistCollaboratorRole.EDITOR,
      status: PlaylistCollaboratorStatus.PENDING,
    });
    collaboratorRepository.save.mockResolvedValue({
      id: 'collab-1',
      playlistId: 'playlist-1',
      userId: 'user-2',
      role: PlaylistCollaboratorRole.EDITOR,
      status: PlaylistCollaboratorStatus.PENDING,
    });

    const result = await service.inviteCollaborator(
      'playlist-1',
      'owner-1',
      'user2',
      PlaylistCollaboratorRole.EDITOR,
    );

    expect(result.role).toBe(PlaylistCollaboratorRole.EDITOR);
    expect(activitiesService.create).toHaveBeenCalled();
  });

  it('accepts collaborator invites', async () => {
    collaboratorRepository.findOne.mockResolvedValue({
      id: 'collab-1',
      playlistId: 'playlist-1',
      userId: 'user-2',
      role: PlaylistCollaboratorRole.EDITOR,
      status: PlaylistCollaboratorStatus.PENDING,
    });
    collaboratorRepository.save.mockResolvedValue({
      id: 'collab-1',
      playlistId: 'playlist-1',
      userId: 'user-2',
      role: PlaylistCollaboratorRole.EDITOR,
      status: PlaylistCollaboratorStatus.ACCEPTED,
    });

    const result = await service.acceptCollaboratorInvite(
      'playlist-1',
      'collab-1',
      'user-2',
    );

    expect(result.status).toBe(PlaylistCollaboratorStatus.ACCEPTED);
    expect(activitiesService.create).toHaveBeenCalled();
  });

  it('removes collaborators as owner', async () => {
    const playlist = {
      id: 'playlist-1',
      userId: 'owner-1',
      smartPlaylist: null,
    } as Playlist;

    playlistRepository.findOne.mockResolvedValue(playlist);
    collaboratorRepository.findOne.mockResolvedValue({
      id: 'collab-1',
      playlistId: 'playlist-1',
      userId: 'user-2',
      role: PlaylistCollaboratorRole.EDITOR,
    });

    await service.removeCollaborator('playlist-1', 'collab-1', 'owner-1');

    expect(collaboratorRepository.remove).toHaveBeenCalled();
    expect(activitiesService.create).toHaveBeenCalled();
  });
});
