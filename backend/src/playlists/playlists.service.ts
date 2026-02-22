import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Brackets } from 'typeorm';
import { Playlist } from './entities/playlist.entity';
import { PlaylistTrack } from './entities/playlist-track.entity';
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
import { Track } from '../tracks/entities/track.entity';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';
import { AddTrackDto } from './dto/add-track.dto';
import { ReorderTracksDto } from './dto/reorder-tracks.dto';
import { DuplicatePlaylistDto } from './dto/duplicate-playlist.dto';
import {
  PlaylistPaginationDto,
  PaginatedPlaylistResponse,
} from './dto/pagination.dto';
import { ActivitiesService } from '../activities/activities.service';
import { ActivityType, EntityType } from '../activities/entities/activity.entity';
import { CreateActivityDto } from '../activities/dto/create-activity.dto';
import { EntityActivityQueryDto } from '../activities/dto/entity-activity-query.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class PlaylistsService {
  private readonly logger = new Logger(PlaylistsService.name);

  constructor(
    @InjectRepository(Playlist)
    private readonly playlistRepository: Repository<Playlist>,
    @InjectRepository(PlaylistTrack)
    private readonly playlistTrackRepository: Repository<PlaylistTrack>,
    @InjectRepository(PlaylistCollaborator)
    private readonly collaboratorRepository: Repository<PlaylistCollaborator>,
    @InjectRepository(PlaylistChangeRequest)
    private readonly changeRequestRepository: Repository<PlaylistChangeRequest>,
    @InjectRepository(SmartPlaylist)
    private readonly smartPlaylistRepository: Repository<SmartPlaylist>,
    @InjectRepository(Track)
    private readonly trackRepository: Repository<Track>,
    private readonly activitiesService: ActivitiesService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Create a new playlist
   */
  async create(userId: string, createPlaylistDto: CreatePlaylistDto): Promise<Playlist> {
    const playlist = this.playlistRepository.create({
      ...createPlaylistDto,
      userId,
      trackCount: 0,
      totalDuration: 0,
    });

    const savedPlaylist = await this.playlistRepository.save(playlist);
    await this.ensureOwnerCollaborator(savedPlaylist.id, userId);
    this.logger.log(`Playlist created: ${savedPlaylist.id} by user ${userId}`);
    
    return savedPlaylist;
  }

  /**
   * Get all playlists with pagination and filtering
   */
  async findAll(
    userId: string,
    paginationDto: PlaylistPaginationDto,
  ): Promise<PaginatedPlaylistResponse<Playlist>> {
    const { page = 1, limit = 10, isPublic } = paginationDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.playlistRepository
      .createQueryBuilder('playlist')
      .leftJoinAndSelect('playlist.user', 'user')
      .leftJoinAndSelect('playlist.smartPlaylist', 'smartPlaylist')
      .leftJoin(
        'playlist.collaborators',
        'collaborator',
        'collaborator.userId = :userId AND collaborator.status = :status',
        { userId, status: PlaylistCollaboratorStatus.ACCEPTED },
      )
      .where(
        new Brackets((qb) => {
          qb.where('playlist.userId = :userId', { userId }).orWhere(
            'collaborator.id IS NOT NULL',
          );
        }),
      )
      .distinct(true);

    if (isPublic !== undefined) {
      queryBuilder.andWhere('playlist.isPublic = :isPublic', { isPublic });
    }

    queryBuilder
      .orderBy('playlist.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Get all public playlists
   */
  async findPublic(
    paginationDto: PlaylistPaginationDto,
  ): Promise<PaginatedPlaylistResponse<Playlist>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.playlistRepository
      .createQueryBuilder('playlist')
      .leftJoinAndSelect('playlist.user', 'user')
      .leftJoinAndSelect('playlist.smartPlaylist', 'smartPlaylist')
      .where('playlist.isPublic = :isPublic', { isPublic: true })
      .orderBy('playlist.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Get a playlist by ID with tracks
   */
  async findOne(id: string, userId?: string): Promise<Playlist> {
    const playlist = await this.playlistRepository.findOne({
      where: { id },
      relations: [
        'user',
        'playlistTracks',
        'playlistTracks.track',
        'playlistTracks.track.artist',
        'smartPlaylist',
      ],
    });

    if (!playlist) {
      throw new NotFoundException(`Playlist with ID ${id} not found`);
    }

    const hasAccess = await this.canViewPlaylist(playlist, userId);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this playlist');
    }

    // Sort tracks by position
    if (playlist.playlistTracks) {
      playlist.playlistTracks.sort((a, b) => a.position - b.position);
    }

    return playlist;
  }

  /**
   * Update a playlist
   */
  async update(
    id: string,
    userId: string,
    updatePlaylistDto: UpdatePlaylistDto,
  ): Promise<Playlist> {
    const playlist = await this.findOne(id, userId);

    // Verify ownership
    if (playlist.userId !== userId) {
      throw new ForbiddenException('You can only update your own playlists');
    }

    Object.assign(playlist, updatePlaylistDto);
    const updatedPlaylist = await this.playlistRepository.save(playlist);
    
    this.logger.log(`Playlist updated: ${id}`);
    return updatedPlaylist;
  }

  /**
   * Delete a playlist
   */
  async remove(id: string, userId: string): Promise<void> {
    const playlist = await this.findOne(id, userId);

    // Verify ownership
    if (playlist.userId !== userId) {
      throw new ForbiddenException('You can only delete your own playlists');
    }

    await this.playlistRepository.remove(playlist);
    this.logger.log(`Playlist deleted: ${id}`);
  }

  /**
   * Add a track to a playlist
   */
  async addTrack(
    playlistId: string,
    userId: string,
    addTrackDto: AddTrackDto,
  ): Promise<Playlist | PlaylistChangeRequest> {
    const playlist = await this.getPlaylistForEdit(playlistId);
    const role = await this.getUserRole(playlist, userId);
    this.assertCanEdit(playlist, role);

    if (playlist.approvalRequired && role !== PlaylistCollaboratorRole.OWNER) {
      await this.ensureTrackIsValidForAdd(playlistId, addTrackDto.trackId);
      const changeRequest = await this.createChangeRequest(
        playlistId,
        userId,
        PlaylistChangeAction.ADD_TRACK,
        {
          trackId: addTrackDto.trackId,
          position: addTrackDto.position,
        },
      );
      return changeRequest;
    }

    return this.applyAddTrack(playlist, userId, addTrackDto);
  }

  /**
   * Remove a track from a playlist
   */
  async removeTrack(
    playlistId: string,
    trackId: string,
    userId: string,
  ): Promise<Playlist | PlaylistChangeRequest> {
    const playlist = await this.getPlaylistForEdit(playlistId);
    const role = await this.getUserRole(playlist, userId);
    this.assertCanEdit(playlist, role);

    if (playlist.approvalRequired && role !== PlaylistCollaboratorRole.OWNER) {
      await this.ensureTrackIsInPlaylist(playlistId, trackId);
      const changeRequest = await this.createChangeRequest(
        playlistId,
        userId,
        PlaylistChangeAction.REMOVE_TRACK,
        { trackId },
      );
      return changeRequest;
    }

    return this.applyRemoveTrack(playlistId, trackId, userId);
  }

  /**
   * Reorder tracks in a playlist
   */
  async reorderTracks(
    playlistId: string,
    userId: string,
    reorderTracksDto: ReorderTracksDto,
  ): Promise<Playlist | PlaylistChangeRequest> {
    const playlist = await this.getPlaylistForEdit(playlistId);
    const role = await this.getUserRole(playlist, userId);
    this.assertCanEdit(playlist, role);

    await this.ensureTracksBelongToPlaylist(playlistId, reorderTracksDto);

    if (playlist.approvalRequired && role !== PlaylistCollaboratorRole.OWNER) {
      const changeRequest = await this.createChangeRequest(
        playlistId,
        userId,
        PlaylistChangeAction.REORDER_TRACKS,
        { tracks: reorderTracksDto.tracks },
      );
      return changeRequest;
    }

    await this.applyReorderTracks(playlistId, reorderTracksDto);
    this.logger.log(`Tracks reordered in playlist ${playlistId}`);
    return this.findOne(playlistId, userId);
  }

  /**
   * Duplicate a playlist
   */
  async duplicate(
    playlistId: string,
    userId: string,
    duplicateDto?: DuplicatePlaylistDto,
  ): Promise<Playlist> {
    const originalPlaylist = await this.findOne(playlistId, userId);

    // Check if user has access (owner or public)
    if (originalPlaylist.userId !== userId && !originalPlaylist.isPublic) {
      throw new ForbiddenException('You do not have access to this playlist');
    }

    // Create new playlist
    const newPlaylist = this.playlistRepository.create({
      userId,
      name: duplicateDto?.name || `${originalPlaylist.name} (Copy)`,
      description: originalPlaylist.description,
      isPublic: duplicateDto?.isPublic ?? originalPlaylist.isPublic,
      coverImage: originalPlaylist.coverImage,
      trackCount: 0,
      totalDuration: 0,
    });

    const savedPlaylist = await this.playlistRepository.save(newPlaylist);

    // Copy tracks
    if (originalPlaylist.playlistTracks && originalPlaylist.playlistTracks.length > 0) {
      const playlistTracks = originalPlaylist.playlistTracks.map((pt, index) =>
        this.playlistTrackRepository.create({
          playlistId: savedPlaylist.id,
          trackId: pt.trackId,
          position: index,
        }),
      );

      await this.playlistTrackRepository.save(playlistTracks);

      // Update metadata
      savedPlaylist.trackCount = playlistTracks.length;
      savedPlaylist.totalDuration = originalPlaylist.totalDuration;
      await this.playlistRepository.save(savedPlaylist);
    }

    this.logger.log(`Playlist ${playlistId} duplicated as ${savedPlaylist.id}`);

    return this.findOne(savedPlaylist.id, userId);
  }

  /**
   * Get playlists by user ID
   */
  async findByUser(
    targetUserId: string,
    requestingUserId?: string,
    paginationDto?: PlaylistPaginationDto,
  ): Promise<PaginatedPlaylistResponse<Playlist>> {
    const { page = 1, limit = 10, isPublic } = paginationDto || {};
    const skip = (page - 1) * limit;

    const queryBuilder = this.playlistRepository
      .createQueryBuilder('playlist')
      .leftJoinAndSelect('playlist.user', 'user')
      .leftJoinAndSelect('playlist.smartPlaylist', 'smartPlaylist')
      .where('playlist.userId = :targetUserId', { targetUserId });

    // If not the owner, only show public playlists
    if (requestingUserId !== targetUserId) {
      queryBuilder.andWhere('playlist.isPublic = :isPublic', { isPublic: true });
    } else if (isPublic !== undefined) {
      queryBuilder.andWhere('playlist.isPublic = :isPublic', { isPublic });
    }

    queryBuilder
      .orderBy('playlist.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Share playlist - returns shareable link/info
   * In a real app, this might generate a share token or handle permissions
   */
  async share(playlistId: string, userId: string): Promise<{
    playlistId: string;
    shareUrl: string;
    isPublic: boolean;
    message: string;
  }> {
    const playlist = await this.findOne(playlistId, userId);

    // Verify ownership
    if (playlist.userId !== userId) {
      throw new ForbiddenException('You can only share your own playlists');
    }

    // Make playlist public if it's not already
    if (!playlist.isPublic) {
      playlist.isPublic = true;
      await this.playlistRepository.save(playlist);
    }

    const shareUrl = `/playlists/${playlistId}`;

    return {
      playlistId: playlist.id,
      shareUrl,
      isPublic: playlist.isPublic,
      message: 'Playlist is now public and shareable',
    };
  }

  async listCollaborators(
    playlistId: string,
    userId: string,
  ): Promise<PlaylistCollaborator[]> {
    const playlist = await this.findOne(playlistId, userId);
    const isOwner = playlist.userId === userId;

    return this.collaboratorRepository.find({
      where: isOwner
        ? { playlistId }
        : { playlistId, status: PlaylistCollaboratorStatus.ACCEPTED },
      relations: ['user'],
      order: { invitedAt: 'ASC' },
    });
  }

  async inviteCollaborator(
    playlistId: string,
    userId: string,
    identifier: string,
    role?: PlaylistCollaboratorRole,
  ): Promise<PlaylistCollaborator> {
    const playlist = await this.getPlaylistForEdit(playlistId);

    if (playlist.userId !== userId) {
      throw new ForbiddenException('Only owners can invite collaborators');
    }

    const normalizedRole = role || PlaylistCollaboratorRole.VIEWER;
    if (normalizedRole === PlaylistCollaboratorRole.OWNER) {
      throw new BadRequestException('Cannot assign owner role via invite');
    }

    const trimmedIdentifier = identifier.trim();
    const invitedUser = trimmedIdentifier.includes('@')
      ? await this.usersService.findByEmail(trimmedIdentifier)
      : await this.usersService.findByUsername(trimmedIdentifier);

    if (invitedUser.id === playlist.userId) {
      throw new BadRequestException('Owner is already a collaborator');
    }

    let collaborator = await this.collaboratorRepository.findOne({
      where: { playlistId, userId: invitedUser.id },
    });

    if (collaborator && collaborator.status === PlaylistCollaboratorStatus.ACCEPTED) {
      throw new BadRequestException('User is already a collaborator');
    }

    if (!collaborator) {
      collaborator = this.collaboratorRepository.create({
        playlistId,
        userId: invitedUser.id,
        role: normalizedRole,
        status: PlaylistCollaboratorStatus.PENDING,
      });
    } else {
      collaborator.role = normalizedRole;
      collaborator.status = PlaylistCollaboratorStatus.PENDING;
      collaborator.acceptedAt = null;
      collaborator.invitedAt = new Date();
    }

    const saved = await this.collaboratorRepository.save(collaborator);

    await this.safeCreateActivity({
      userId,
      activityType: ActivityType.PLAYLIST_COLLABORATOR_INVITED,
      entityType: EntityType.PLAYLIST,
      entityId: playlistId,
      metadata: {
        invitedUserId: invitedUser.id,
        role: normalizedRole,
      },
    });

    return saved;
  }

  async acceptCollaboratorInvite(
    playlistId: string,
    collaboratorId: string,
    userId: string,
  ): Promise<PlaylistCollaborator> {
    const collaborator = await this.collaboratorRepository.findOne({
      where: { id: collaboratorId, playlistId },
    });

    if (!collaborator) {
      throw new NotFoundException('Collaborator invite not found');
    }

    if (collaborator.userId !== userId) {
      throw new ForbiddenException('You cannot accept this invite');
    }

    if (collaborator.status !== PlaylistCollaboratorStatus.ACCEPTED) {
      collaborator.status = PlaylistCollaboratorStatus.ACCEPTED;
      collaborator.acceptedAt = new Date();
    }

    const saved = await this.collaboratorRepository.save(collaborator);

    await this.safeCreateActivity({
      userId,
      activityType: ActivityType.PLAYLIST_COLLABORATOR_ACCEPTED,
      entityType: EntityType.PLAYLIST,
      entityId: playlistId,
      metadata: {
        collaboratorId: saved.id,
        role: saved.role,
      },
    });

    return saved;
  }

  async rejectCollaboratorInvite(
    playlistId: string,
    collaboratorId: string,
    userId: string,
  ): Promise<void> {
    const collaborator = await this.collaboratorRepository.findOne({
      where: { id: collaboratorId, playlistId },
    });

    if (!collaborator) {
      throw new NotFoundException('Collaborator invite not found');
    }

    if (collaborator.userId !== userId) {
      throw new ForbiddenException('You cannot reject this invite');
    }

    await this.collaboratorRepository.remove(collaborator);

    await this.safeCreateActivity({
      userId,
      activityType: ActivityType.PLAYLIST_COLLABORATOR_REJECTED,
      entityType: EntityType.PLAYLIST,
      entityId: playlistId,
      metadata: {
        collaboratorId: collaborator.id,
        role: collaborator.role,
      },
    });
  }

  async updateCollaboratorRole(
    playlistId: string,
    collaboratorId: string,
    userId: string,
    role: PlaylistCollaboratorRole,
  ): Promise<PlaylistCollaborator> {
    const playlist = await this.getPlaylistForEdit(playlistId);

    if (playlist.userId !== userId) {
      throw new ForbiddenException('Only owners can update collaborator roles');
    }

    if (role === PlaylistCollaboratorRole.OWNER) {
      throw new BadRequestException('Cannot assign owner role');
    }

    const collaborator = await this.collaboratorRepository.findOne({
      where: { id: collaboratorId, playlistId },
    });

    if (!collaborator) {
      throw new NotFoundException('Collaborator not found');
    }

    if (collaborator.role === PlaylistCollaboratorRole.OWNER) {
      throw new BadRequestException('Cannot update owner role');
    }

    collaborator.role = role;
    const saved = await this.collaboratorRepository.save(collaborator);

    await this.safeCreateActivity({
      userId,
      activityType: ActivityType.PLAYLIST_COLLABORATOR_ROLE_UPDATED,
      entityType: EntityType.PLAYLIST,
      entityId: playlistId,
      metadata: {
        collaboratorId: collaborator.id,
        role,
      },
    });

    return saved;
  }

  async removeCollaborator(
    playlistId: string,
    collaboratorId: string,
    userId: string,
  ): Promise<void> {
    const playlist = await this.getPlaylistForEdit(playlistId);

    if (playlist.userId !== userId) {
      throw new ForbiddenException('Only owners can remove collaborators');
    }

    const collaborator = await this.collaboratorRepository.findOne({
      where: { id: collaboratorId, playlistId },
    });

    if (!collaborator) {
      throw new NotFoundException('Collaborator not found');
    }

    if (collaborator.role === PlaylistCollaboratorRole.OWNER) {
      throw new BadRequestException('Cannot remove the owner');
    }

    await this.collaboratorRepository.remove(collaborator);

    await this.safeCreateActivity({
      userId,
      activityType: ActivityType.PLAYLIST_COLLABORATOR_REMOVED,
      entityType: EntityType.PLAYLIST,
      entityId: playlistId,
      metadata: {
        collaboratorId: collaborator.id,
        role: collaborator.role,
      },
    });
  }

  async getPlaylistActivities(
    playlistId: string,
    userId: string,
    query: EntityActivityQueryDto,
  ) {
    await this.findOne(playlistId, userId);
    return this.activitiesService.getPlaylistActivities(playlistId, query);
  }

  async listChangeRequests(
    playlistId: string,
    userId: string,
    status?: PlaylistChangeStatus,
  ): Promise<PlaylistChangeRequest[]> {
    const playlist = await this.getPlaylistForEdit(playlistId);

    if (playlist.userId !== userId) {
      throw new ForbiddenException('Only owners can view change requests');
    }

    return this.changeRequestRepository.find({
      where: status ? { playlistId, status } : { playlistId },
      relations: ['requestedBy', 'reviewedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async approveChangeRequest(
    playlistId: string,
    changeRequestId: string,
    userId: string,
  ): Promise<Playlist> {
    const playlist = await this.getPlaylistForEdit(playlistId);

    if (playlist.userId !== userId) {
      throw new ForbiddenException('Only owners can approve changes');
    }

    if (!playlist.approvalRequired) {
      throw new BadRequestException('Approval workflow is not enabled');
    }

    const changeRequest = await this.changeRequestRepository.findOne({
      where: { id: changeRequestId, playlistId, status: PlaylistChangeStatus.PENDING },
    });

    if (!changeRequest) {
      throw new NotFoundException('Change request not found');
    }

    let updatedPlaylist: Playlist;

    if (changeRequest.action === PlaylistChangeAction.ADD_TRACK) {
      const payload = changeRequest.payload as {
        trackId: string;
        position?: number;
      };
      updatedPlaylist = await this.applyAddTrack(
        playlist,
        changeRequest.requestedById,
        payload,
        userId,
      );
    } else if (changeRequest.action === PlaylistChangeAction.REMOVE_TRACK) {
      const payload = changeRequest.payload as { trackId: string };
      updatedPlaylist = await this.applyRemoveTrack(
        playlistId,
        payload.trackId,
        changeRequest.requestedById,
        userId,
      );
    } else {
      const payload = changeRequest.payload as {
        tracks: { trackId: string; position: number }[];
      };
      await this.applyReorderTracks(playlistId, { tracks: payload.tracks });
      updatedPlaylist = await this.findOne(playlistId, userId);
    }

    changeRequest.status = PlaylistChangeStatus.APPROVED;
    changeRequest.reviewedById = userId;
    changeRequest.reviewedAt = new Date();
    await this.changeRequestRepository.save(changeRequest);

    await this.safeCreateActivity({
      userId,
      activityType: ActivityType.PLAYLIST_CHANGE_APPROVED,
      entityType: EntityType.PLAYLIST,
      entityId: playlistId,
      metadata: {
        changeRequestId: changeRequest.id,
        action: changeRequest.action,
      },
    });

    return updatedPlaylist;
  }

  async rejectChangeRequest(
    playlistId: string,
    changeRequestId: string,
    userId: string,
  ): Promise<PlaylistChangeRequest> {
    const playlist = await this.getPlaylistForEdit(playlistId);

    if (playlist.userId !== userId) {
      throw new ForbiddenException('Only owners can reject changes');
    }

    if (!playlist.approvalRequired) {
      throw new BadRequestException('Approval workflow is not enabled');
    }

    const changeRequest = await this.changeRequestRepository.findOne({
      where: { id: changeRequestId, playlistId, status: PlaylistChangeStatus.PENDING },
    });

    if (!changeRequest) {
      throw new NotFoundException('Change request not found');
    }

    changeRequest.status = PlaylistChangeStatus.REJECTED;
    changeRequest.reviewedById = userId;
    changeRequest.reviewedAt = new Date();

    const saved = await this.changeRequestRepository.save(changeRequest);

    await this.safeCreateActivity({
      userId,
      activityType: ActivityType.PLAYLIST_CHANGE_REJECTED,
      entityType: EntityType.PLAYLIST,
      entityId: playlistId,
      metadata: {
        changeRequestId: changeRequest.id,
        action: changeRequest.action,
      },
    });

    return saved;
  }

  private async getPlaylistForEdit(playlistId: string): Promise<Playlist> {
    const playlist = await this.playlistRepository.findOne({
      where: { id: playlistId },
      relations: ['smartPlaylist'],
    });

    if (!playlist) {
      throw new NotFoundException(`Playlist with ID ${playlistId} not found`);
    }

    return playlist;
  }

  private async ensureOwnerCollaborator(
    playlistId: string,
    userId: string,
  ): Promise<void> {
    const existing = await this.collaboratorRepository.findOne({
      where: {
        playlistId,
        userId,
        role: PlaylistCollaboratorRole.OWNER,
        status: PlaylistCollaboratorStatus.ACCEPTED,
      },
    });

    if (existing) {
      return;
    }

    const collaborator = this.collaboratorRepository.create({
      playlistId,
      userId,
      role: PlaylistCollaboratorRole.OWNER,
      status: PlaylistCollaboratorStatus.ACCEPTED,
      acceptedAt: new Date(),
    });

    await this.collaboratorRepository.save(collaborator);
  }

  private async getUserRole(
    playlist: Playlist,
    userId: string,
  ): Promise<PlaylistCollaboratorRole | null> {
    if (!userId) {
      return null;
    }

    if (playlist.userId === userId) {
      return PlaylistCollaboratorRole.OWNER;
    }

    const collaborator = await this.collaboratorRepository.findOne({
      where: {
        playlistId: playlist.id,
        userId,
        status: PlaylistCollaboratorStatus.ACCEPTED,
      },
    });

    return collaborator?.role || null;
  }

  private assertCanEdit(
    playlist: Playlist,
    role: PlaylistCollaboratorRole | null,
  ): void {
    if (!role) {
      throw new ForbiddenException('You do not have access to modify this playlist');
    }

    if (role === PlaylistCollaboratorRole.VIEWER) {
      throw new ForbiddenException('You do not have permission to edit this playlist');
    }

    if (playlist.smartPlaylist) {
      throw new ForbiddenException('Smart playlists cannot be manually edited');
    }
  }

  private async canViewPlaylist(
    playlist: Playlist,
    userId?: string,
  ): Promise<boolean> {
    if (playlist.isPublic) {
      return true;
    }

    if (!userId) {
      return false;
    }

    if (playlist.userId === userId) {
      return true;
    }

    const collaborator = await this.collaboratorRepository.findOne({
      where: {
        playlistId: playlist.id,
        userId,
        status: PlaylistCollaboratorStatus.ACCEPTED,
      },
    });

    return Boolean(collaborator);
  }

  private async createChangeRequest(
    playlistId: string,
    userId: string,
    action: PlaylistChangeAction,
    payload: Record<string, any>,
  ): Promise<PlaylistChangeRequest> {
    const changeRequest = this.changeRequestRepository.create({
      playlistId,
      requestedById: userId,
      action,
      payload,
      status: PlaylistChangeStatus.PENDING,
    });

    const saved = await this.changeRequestRepository.save(changeRequest);

    await this.safeCreateActivity({
      userId,
      activityType: ActivityType.PLAYLIST_CHANGE_REQUESTED,
      entityType: EntityType.PLAYLIST,
      entityId: playlistId,
      metadata: {
        changeRequestId: saved.id,
        action,
        payload,
      },
    });

    return saved;
  }

  private async ensureTrackIsValidForAdd(
    playlistId: string,
    trackId: string,
  ): Promise<void> {
    const track = await this.trackRepository.findOne({ where: { id: trackId } });
    if (!track) {
      throw new NotFoundException(`Track with ID ${trackId} not found`);
    }

    const existingPlaylistTrack = await this.playlistTrackRepository.findOne({
      where: {
        playlistId,
        trackId,
      },
    });

    if (existingPlaylistTrack) {
      throw new BadRequestException('Track is already in this playlist');
    }
  }

  private async ensureTrackIsInPlaylist(
    playlistId: string,
    trackId: string,
  ): Promise<void> {
    const playlistTrack = await this.playlistTrackRepository.findOne({
      where: {
        playlistId,
        trackId,
      },
    });

    if (!playlistTrack) {
      throw new NotFoundException('Track not found in this playlist');
    }
  }

  private async ensureTracksBelongToPlaylist(
    playlistId: string,
    reorderTracksDto: ReorderTracksDto,
  ): Promise<void> {
    const trackIds = reorderTracksDto.tracks.map((t) => t.trackId);
    const existingTracks = await this.playlistTrackRepository.find({
      where: {
        playlistId,
        trackId: In(trackIds),
      },
    });

    if (existingTracks.length !== trackIds.length) {
      throw new BadRequestException('Some tracks are not in this playlist');
    }
  }

  private async applyAddTrack(
    playlist: Playlist,
    actorUserId: string,
    addTrackDto: AddTrackDto,
    requestingUserId?: string,
  ): Promise<Playlist> {
    const track = await this.trackRepository.findOne({
      where: { id: addTrackDto.trackId },
    });

    if (!track) {
      throw new NotFoundException(`Track with ID ${addTrackDto.trackId} not found`);
    }

    const existingPlaylistTrack = await this.playlistTrackRepository.findOne({
      where: {
        playlistId: playlist.id,
        trackId: addTrackDto.trackId,
      },
    });

    if (existingPlaylistTrack) {
      throw new BadRequestException('Track is already in this playlist');
    }

    let position: number;
    if (addTrackDto.position !== undefined) {
      position = addTrackDto.position;

      await this.playlistTrackRepository
        .createQueryBuilder()
        .update(PlaylistTrack)
        .set({ position: () => 'position + 1' })
        .where('playlistId = :playlistId', { playlistId: playlist.id })
        .andWhere('position >= :position', { position })
        .execute();
    } else {
      const maxPosition = await this.playlistTrackRepository
        .createQueryBuilder('pt')
        .select('MAX(pt.position)', 'max')
        .where('pt.playlistId = :playlistId', { playlistId: playlist.id })
        .getRawOne();

      position = maxPosition?.max !== null ? maxPosition.max + 1 : 0;
    }

    const playlistTrack = this.playlistTrackRepository.create({
      playlistId: playlist.id,
      trackId: addTrackDto.trackId,
      position,
    });

    await this.playlistTrackRepository.save(playlistTrack);

    playlist.trackCount += 1;
    playlist.totalDuration += track.duration || 0;
    await this.playlistRepository.save(playlist);

    this.logger.log(
      `Track ${addTrackDto.trackId} added to playlist ${playlist.id} at position ${position}`,
    );

    await this.safeCreateActivity({
      userId: actorUserId,
      activityType: ActivityType.PLAYLIST_TRACK_ADDED,
      entityType: EntityType.PLAYLIST,
      entityId: playlist.id,
      metadata: {
        trackId: addTrackDto.trackId,
        trackTitle: track.title,
        position,
      },
    });

    return this.findOne(playlist.id, requestingUserId ?? actorUserId);
  }

  private async applyRemoveTrack(
    playlistId: string,
    trackId: string,
    actorUserId: string,
    requestingUserId?: string,
  ): Promise<Playlist> {
    const playlist = await this.getPlaylistForEdit(playlistId);

    const playlistTrack = await this.playlistTrackRepository.findOne({
      where: {
        playlistId,
        trackId,
      },
      relations: ['track'],
    });

    if (!playlistTrack) {
      throw new NotFoundException('Track not found in this playlist');
    }

    const removedPosition = playlistTrack.position;

    await this.playlistTrackRepository.remove(playlistTrack);

    await this.playlistTrackRepository
      .createQueryBuilder()
      .update(PlaylistTrack)
      .set({ position: () => 'position - 1' })
      .where('playlistId = :playlistId', { playlistId })
      .andWhere('position > :position', { position: removedPosition })
      .execute();

    playlist.trackCount = Math.max(0, playlist.trackCount - 1);
    if (playlistTrack.track) {
      playlist.totalDuration = Math.max(
        0,
        playlist.totalDuration - (playlistTrack.track.duration || 0),
      );
    }
    await this.playlistRepository.save(playlist);

    this.logger.log(`Track ${trackId} removed from playlist ${playlistId}`);

    await this.safeCreateActivity({
      userId: actorUserId,
      activityType: ActivityType.PLAYLIST_TRACK_REMOVED,
      entityType: EntityType.PLAYLIST,
      entityId: playlistId,
      metadata: {
        trackId,
        trackTitle: playlistTrack.track?.title,
      },
    });

    return this.findOne(playlistId, requestingUserId ?? actorUserId);
  }

  private async applyReorderTracks(
    playlistId: string,
    reorderTracksDto: ReorderTracksDto,
  ): Promise<void> {
    for (const trackPosition of reorderTracksDto.tracks) {
      await this.playlistTrackRepository.update(
        { playlistId, trackId: trackPosition.trackId },
        { position: trackPosition.position },
      );
    }
  }

  private async safeCreateActivity(
    data: Omit<CreateActivityDto, 'id'>,
  ): Promise<void> {
    try {
      await this.activitiesService.create(data);
    } catch (error) {
      this.logger.warn(`Failed to create activity: ${error.message}`);
    }
  }
}
