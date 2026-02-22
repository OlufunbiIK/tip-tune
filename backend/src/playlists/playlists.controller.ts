import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { PlaylistsService } from './playlists.service';
import { SmartPlaylistsService } from './smart-playlists.service';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';
import { AddTrackDto } from './dto/add-track.dto';
import { ReorderTracksDto } from './dto/reorder-tracks.dto';
import { DuplicatePlaylistDto } from './dto/duplicate-playlist.dto';
import { PlaylistPaginationDto } from './dto/pagination.dto';
import { InviteCollaboratorDto } from './dto/invite-collaborator.dto';
import { UpdateCollaboratorRoleDto } from './dto/update-collaborator-role.dto';
import { CreateSmartPlaylistDto } from './dto/create-smart-playlist.dto';
import { PreviewSmartPlaylistDto } from './dto/preview-smart-playlist.dto';
import { ChangeRequestQueryDto } from './dto/change-request-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserData,
} from '../auth/decorators/current-user.decorator';
import { Playlist } from './entities/playlist.entity';
import { PlaylistChangeRequest } from './entities/playlist-change-request.entity';
import { PlaylistCollaborator } from './entities/playlist-collaborator.entity';
import { EntityActivityQueryDto } from '../activities/dto/entity-activity-query.dto';

@ApiTags('Playlists')
@Controller('playlists')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiCookieAuth()
export class PlaylistsController {
  constructor(
    private readonly playlistsService: PlaylistsService,
    private readonly smartPlaylistsService: SmartPlaylistsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new playlist' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Playlist created successfully',
    type: Playlist,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  async create(
    @CurrentUser() user: CurrentUserData,
    @Body() createPlaylistDto: CreatePlaylistDto,
  ): Promise<Playlist> {
    return this.playlistsService.create(user.userId, createPlaylistDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all playlists for current user' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'isPublic', required: false, type: Boolean })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Playlists retrieved successfully',
  })
  async findAll(
    @CurrentUser() user: CurrentUserData,
    @Query() paginationDto: PlaylistPaginationDto,
  ) {
    return this.playlistsService.findAll(user.userId, paginationDto);
  }

  @Post('smart/preview')
  @ApiOperation({ summary: 'Preview tracks for a smart playlist' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Smart playlist preview generated',
  })
  async previewSmartPlaylist(
    @CurrentUser() user: CurrentUserData,
    @Body() previewDto: PreviewSmartPlaylistDto,
  ) {
    return this.smartPlaylistsService.previewTracks(
      user.userId,
      previewDto.criteria,
    );
  }

  @Post('smart')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a smart playlist' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Smart playlist created successfully',
    type: Playlist,
  })
  async createSmartPlaylist(
    @CurrentUser() user: CurrentUserData,
    @Body() createSmartPlaylistDto: CreateSmartPlaylistDto,
  ): Promise<Playlist> {
    return this.smartPlaylistsService.createSmartPlaylist(
      user.userId,
      createSmartPlaylistDto,
    );
  }

  @Get('public')
  @ApiOperation({ summary: 'Get all public playlists' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Public playlists retrieved successfully',
  })
  async findPublic(@Query() paginationDto: PlaylistPaginationDto) {
    return this.playlistsService.findPublic(paginationDto);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: "Get playlists by user ID" })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'isPublic', required: false, type: Boolean })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User playlists retrieved successfully',
  })
  async findByUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: CurrentUserData,
    @Query() paginationDto: PlaylistPaginationDto,
  ) {
    return this.playlistsService.findByUser(userId, user.userId, paginationDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a playlist by ID with tracks' })
  @ApiParam({ name: 'id', description: 'Playlist ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Playlist found',
    type: Playlist,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Playlist not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<Playlist> {
    return this.playlistsService.findOne(id, user.userId);
  }

  @Get(':id/activities')
  @ApiOperation({ summary: 'Get playlist activity log' })
  @ApiParam({ name: 'id', description: 'Playlist ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Playlist activities retrieved successfully',
  })
  async getPlaylistActivities(
    @Param('id', ParseUUIDPipe) playlistId: string,
    @CurrentUser() user: CurrentUserData,
    @Query() query: EntityActivityQueryDto,
  ) {
    return this.playlistsService.getPlaylistActivities(
      playlistId,
      user.userId,
      query,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a playlist' })
  @ApiParam({ name: 'id', description: 'Playlist ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Playlist updated successfully',
    type: Playlist,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Playlist not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() updatePlaylistDto: UpdatePlaylistDto,
  ): Promise<Playlist> {
    return this.playlistsService.update(id, user.userId, updatePlaylistDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a playlist' })
  @ApiParam({ name: 'id', description: 'Playlist ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Playlist deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Playlist not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<void> {
    return this.playlistsService.remove(id, user.userId);
  }

  @Post(':id/tracks')
  @ApiOperation({ summary: 'Add a track to a playlist' })
  @ApiParam({ name: 'id', description: 'Playlist ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Track added successfully',
    type: Playlist,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Track already in playlist or invalid data',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Playlist or track not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  async addTrack(
    @Param('id', ParseUUIDPipe) playlistId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() addTrackDto: AddTrackDto,
  ): Promise<Playlist | PlaylistChangeRequest> {
    return this.playlistsService.addTrack(playlistId, user.userId, addTrackDto);
  }

  @Delete(':id/tracks/:trackId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a track from a playlist' })
  @ApiParam({ name: 'id', description: 'Playlist ID' })
  @ApiParam({ name: 'trackId', description: 'Track ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Track removed successfully',
    type: Playlist,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Playlist or track not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  async removeTrack(
    @Param('id', ParseUUIDPipe) playlistId: string,
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<Playlist | PlaylistChangeRequest> {
    return this.playlistsService.removeTrack(playlistId, trackId, user.userId);
  }

  @Patch(':id/tracks/reorder')
  @ApiOperation({ summary: 'Reorder tracks in a playlist' })
  @ApiParam({ name: 'id', description: 'Playlist ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tracks reordered successfully',
    type: Playlist,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid track positions',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  async reorderTracks(
    @Param('id', ParseUUIDPipe) playlistId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() reorderTracksDto: ReorderTracksDto,
  ): Promise<Playlist | PlaylistChangeRequest> {
    return this.playlistsService.reorderTracks(playlistId, user.userId, reorderTracksDto);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate a playlist' })
  @ApiParam({ name: 'id', description: 'Playlist ID to duplicate' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Playlist duplicated successfully',
    type: Playlist,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Playlist not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  async duplicate(
    @Param('id', ParseUUIDPipe) playlistId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() duplicateDto?: DuplicatePlaylistDto,
  ): Promise<Playlist> {
    return this.playlistsService.duplicate(playlistId, user.userId, duplicateDto);
  }

  @Post(':id/share')
  @ApiOperation({ summary: 'Share a playlist (makes it public)' })
  @ApiParam({ name: 'id', description: 'Playlist ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Playlist shared successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Playlist not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  async share(
    @Param('id', ParseUUIDPipe) playlistId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.playlistsService.share(playlistId, user.userId);
  }

  @Get(':id/collaborators')
  @ApiOperation({ summary: 'List playlist collaborators' })
  @ApiParam({ name: 'id', description: 'Playlist ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Collaborators retrieved successfully',
    type: [PlaylistCollaborator],
  })
  async listCollaborators(
    @Param('id', ParseUUIDPipe) playlistId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<PlaylistCollaborator[]> {
    return this.playlistsService.listCollaborators(playlistId, user.userId);
  }

  @Post(':id/collaborators')
  @ApiOperation({ summary: 'Invite a collaborator to a playlist' })
  @ApiParam({ name: 'id', description: 'Playlist ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Collaborator invited successfully',
    type: PlaylistCollaborator,
  })
  async inviteCollaborator(
    @Param('id', ParseUUIDPipe) playlistId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() inviteDto: InviteCollaboratorDto,
  ): Promise<PlaylistCollaborator> {
    return this.playlistsService.inviteCollaborator(
      playlistId,
      user.userId,
      inviteDto.identifier,
      inviteDto.role,
    );
  }

  @Post(':id/collaborators/:collaboratorId/accept')
  @ApiOperation({ summary: 'Accept a collaborator invite' })
  @ApiParam({ name: 'id', description: 'Playlist ID' })
  @ApiParam({ name: 'collaboratorId', description: 'Collaborator ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Collaborator invite accepted',
    type: PlaylistCollaborator,
  })
  async acceptCollaboratorInvite(
    @Param('id', ParseUUIDPipe) playlistId: string,
    @Param('collaboratorId', ParseUUIDPipe) collaboratorId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<PlaylistCollaborator> {
    return this.playlistsService.acceptCollaboratorInvite(
      playlistId,
      collaboratorId,
      user.userId,
    );
  }

  @Post(':id/collaborators/:collaboratorId/reject')
  @ApiOperation({ summary: 'Reject a collaborator invite' })
  @ApiParam({ name: 'id', description: 'Playlist ID' })
  @ApiParam({ name: 'collaboratorId', description: 'Collaborator ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Collaborator invite rejected',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async rejectCollaboratorInvite(
    @Param('id', ParseUUIDPipe) playlistId: string,
    @Param('collaboratorId', ParseUUIDPipe) collaboratorId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<void> {
    return this.playlistsService.rejectCollaboratorInvite(
      playlistId,
      collaboratorId,
      user.userId,
    );
  }

  @Patch(':id/collaborators/:collaboratorId')
  @ApiOperation({ summary: 'Update collaborator role' })
  @ApiParam({ name: 'id', description: 'Playlist ID' })
  @ApiParam({ name: 'collaboratorId', description: 'Collaborator ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Collaborator role updated',
    type: PlaylistCollaborator,
  })
  async updateCollaboratorRole(
    @Param('id', ParseUUIDPipe) playlistId: string,
    @Param('collaboratorId', ParseUUIDPipe) collaboratorId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() updateDto: UpdateCollaboratorRoleDto,
  ): Promise<PlaylistCollaborator> {
    return this.playlistsService.updateCollaboratorRole(
      playlistId,
      collaboratorId,
      user.userId,
      updateDto.role,
    );
  }

  @Delete(':id/collaborators/:collaboratorId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a collaborator from a playlist' })
  @ApiParam({ name: 'id', description: 'Playlist ID' })
  @ApiParam({ name: 'collaboratorId', description: 'Collaborator ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Collaborator removed successfully',
  })
  async removeCollaborator(
    @Param('id', ParseUUIDPipe) playlistId: string,
    @Param('collaboratorId', ParseUUIDPipe) collaboratorId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<void> {
    return this.playlistsService.removeCollaborator(
      playlistId,
      collaboratorId,
      user.userId,
    );
  }

  @Get(':id/change-requests')
  @ApiOperation({ summary: 'List playlist change requests' })
  @ApiParam({ name: 'id', description: 'Playlist ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Change requests retrieved successfully',
    type: [PlaylistChangeRequest],
  })
  async listChangeRequests(
    @Param('id', ParseUUIDPipe) playlistId: string,
    @CurrentUser() user: CurrentUserData,
    @Query() query: ChangeRequestQueryDto,
  ): Promise<PlaylistChangeRequest[]> {
    return this.playlistsService.listChangeRequests(
      playlistId,
      user.userId,
      query.status,
    );
  }

  @Post(':id/change-requests/:changeRequestId/approve')
  @ApiOperation({ summary: 'Approve a playlist change request' })
  @ApiParam({ name: 'id', description: 'Playlist ID' })
  @ApiParam({ name: 'changeRequestId', description: 'Change request ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Change request approved and applied',
    type: Playlist,
  })
  async approveChangeRequest(
    @Param('id', ParseUUIDPipe) playlistId: string,
    @Param('changeRequestId', ParseUUIDPipe) changeRequestId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<Playlist> {
    return this.playlistsService.approveChangeRequest(
      playlistId,
      changeRequestId,
      user.userId,
    );
  }

  @Post(':id/change-requests/:changeRequestId/reject')
  @ApiOperation({ summary: 'Reject a playlist change request' })
  @ApiParam({ name: 'id', description: 'Playlist ID' })
  @ApiParam({ name: 'changeRequestId', description: 'Change request ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Change request rejected',
    type: PlaylistChangeRequest,
  })
  async rejectChangeRequest(
    @Param('id', ParseUUIDPipe) playlistId: string,
    @Param('changeRequestId', ParseUUIDPipe) changeRequestId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<PlaylistChangeRequest> {
    return this.playlistsService.rejectChangeRequest(
      playlistId,
      changeRequestId,
      user.userId,
    );
  }
}
