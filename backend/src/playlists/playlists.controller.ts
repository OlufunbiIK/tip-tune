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
  Req,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiCookieAuth,
} from "@nestjs/swagger";
import { PlaylistsService } from "./playlists.service";
import { CreatePlaylistDto } from "./dto/create-playlist.dto";
import { UpdatePlaylistDto } from "./dto/update-playlist.dto";
import { AddTrackDto } from "./dto/add-track.dto";
import { ReorderTracksDto } from "./dto/reorder-tracks.dto";
import { DuplicatePlaylistDto } from "./dto/duplicate-playlist.dto";
import { PlaylistPaginationDto } from "./dto/pagination.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import {
  CurrentUser,
  CurrentUserData,
} from "../auth/decorators/current-user.decorator";
import { Playlist } from "./entities/playlist.entity";

@ApiTags("Playlists")
@Controller("playlists")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiCookieAuth()
export class PlaylistsController {
  constructor(private readonly playlistsService: PlaylistsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new playlist" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Playlist created successfully",
    type: Playlist,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Invalid input data",
  })
  async create(
    @CurrentUser() user: CurrentUserData,
    @Body() createPlaylistDto: CreatePlaylistDto,
  ): Promise<Playlist> {
    return this.playlistsService.create(user.userId, createPlaylistDto);
  }

  @Get()
  @ApiOperation({ summary: "Get all playlists for current user" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "isPublic", required: false, type: Boolean })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Playlists retrieved successfully",
  })
  async findAll(
    @CurrentUser() user: CurrentUserData,
    @Query() paginationDto: PlaylistPaginationDto,
  ) {
    return this.playlistsService.findAll(user.userId, paginationDto);
  }

  @Get("public")
  @ApiOperation({ summary: "Get all public playlists" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Public playlists retrieved successfully",
  })
  async findPublic(@Query() paginationDto: PlaylistPaginationDto) {
    return this.playlistsService.findPublic(paginationDto);
  }

  @Get("user/:userId")
  @ApiOperation({ summary: "Get playlists by user ID" })
  @ApiParam({ name: "userId", description: "User ID" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "isPublic", required: false, type: Boolean })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "User playlists retrieved successfully",
  })
  async findByUser(
    @Param("userId", ParseUUIDPipe) userId: string,
    @CurrentUser() user: CurrentUserData,
    @Query() paginationDto: PlaylistPaginationDto,
  ) {
    return this.playlistsService.findByUser(userId, user.userId, paginationDto);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a playlist by ID with tracks" })
  @ApiParam({ name: "id", description: "Playlist ID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Playlist found",
    type: Playlist,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Playlist not found",
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: "Access denied",
  })
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<Playlist> {
    return this.playlistsService.findOne(id, user.userId);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a playlist" })
  @ApiParam({ name: "id", description: "Playlist ID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Playlist updated successfully",
    type: Playlist,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Playlist not found",
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: "Access denied",
  })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() updatePlaylistDto: UpdatePlaylistDto,
  ): Promise<Playlist> {
    return this.playlistsService.update(id, user.userId, updatePlaylistDto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a playlist" })
  @ApiParam({ name: "id", description: "Playlist ID" })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: "Playlist deleted successfully",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Playlist not found",
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: "Access denied",
  })
  async remove(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<void> {
    return this.playlistsService.remove(id, user.userId);
  }

  @Post(":id/tracks")
  @ApiOperation({ summary: "Add a track to a playlist" })
  @ApiParam({ name: "id", description: "Playlist ID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Track added successfully",
    type: Playlist,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Track already in playlist or invalid data",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Playlist or track not found",
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: "Access denied",
  })
  async addTrack(
    @Param("id", ParseUUIDPipe) playlistId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() addTrackDto: AddTrackDto,
  ): Promise<Playlist> {
    return this.playlistsService.addTrack(playlistId, user.userId, addTrackDto);
  }

  @Delete(":id/tracks/:trackId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Remove a track from a playlist" })
  @ApiParam({ name: "id", description: "Playlist ID" })
  @ApiParam({ name: "trackId", description: "Track ID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Track removed successfully",
    type: Playlist,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Playlist or track not found",
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: "Access denied",
  })
  async removeTrack(
    @Param("id", ParseUUIDPipe) playlistId: string,
    @Param("trackId", ParseUUIDPipe) trackId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<Playlist> {
    return this.playlistsService.removeTrack(playlistId, trackId, user.userId);
  }

  @Patch(":id/tracks/reorder")
  @ApiOperation({ summary: "Reorder tracks in a playlist" })
  @ApiParam({ name: "id", description: "Playlist ID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Tracks reordered successfully",
    type: Playlist,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Invalid track positions",
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: "Access denied",
  })
  async reorderTracks(
    @Param("id", ParseUUIDPipe) playlistId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() reorderTracksDto: ReorderTracksDto,
  ): Promise<Playlist> {
    return this.playlistsService.reorderTracks(
      playlistId,
      user.userId,
      reorderTracksDto,
    );
  }

  @Post(":id/duplicate")
  @ApiOperation({ summary: "Duplicate a playlist" })
  @ApiParam({ name: "id", description: "Playlist ID to duplicate" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Playlist duplicated successfully",
    type: Playlist,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Playlist not found",
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: "Access denied",
  })
  async duplicate(
    @Param("id", ParseUUIDPipe) playlistId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() duplicateDto?: DuplicatePlaylistDto,
  ): Promise<Playlist> {
    return this.playlistsService.duplicate(
      playlistId,
      user.userId,
      duplicateDto,
    );
  }

  @Post(":id/share")
  @ApiOperation({ summary: "Share a playlist (makes it public)" })
  @ApiParam({ name: "id", description: "Playlist ID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Playlist shared successfully",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Playlist not found",
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: "Access denied",
  })
  async share(
    @Param("id", ParseUUIDPipe) playlistId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.playlistsService.share(playlistId, user.userId);
  }
}
