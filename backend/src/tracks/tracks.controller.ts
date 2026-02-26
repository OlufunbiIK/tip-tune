import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UploadedFile,
  UseInterceptors,
  ParseUUIDPipe,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody, ApiQuery } from '@nestjs/swagger';
import { TracksService } from './tracks.service';
import { CreateTrackDto } from './dto/create-track.dto';
import { TrackFilterDto } from './dto/pagination.dto';
import { Track } from './entities/track.entity';
import { ThrottleOverride } from '../common/decorators/throttle-override.decorator';

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@ApiTags('tracks')
@Controller('tracks')
export class TracksController {
  constructor(private readonly tracksService: TracksService) {}

  @Post()
  @ThrottleOverride('FILE_UPLOAD') // 5 requests per minute for track creation with file
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Create a new track with optional audio file' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: 'Track created successfully',
    type: Track,
  })
  async create(
    @Body() createTrackDto: CreateTrackDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<Track> {
    return this.tracksService.create(createTrackDto, file);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tracks with pagination and filtering' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 10, max: 100)' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort field (default: createdAt)' })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Sort order ASC or DESC (default: DESC)' })
  @ApiQuery({ name: 'artistId', required: false, description: 'Filter by artist ID' })
  @ApiQuery({ name: 'genre', required: false, description: 'Filter by genre' })
  @ApiQuery({ name: 'album', required: false, description: 'Filter by album name' })
  @ApiQuery({ name: 'isPublic', required: false, description: 'Filter by public status' })
  @ApiQuery({ name: 'releaseDate', required: false, description: 'Filter by release date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Paginated list of tracks' })
  findAll(@Query() filter: TrackFilterDto): Promise<PaginatedResult<Track>> {
    return this.tracksService.findAll(filter);
  }

  @Get('public')
  @ApiOperation({ summary: 'Get all public tracks with pagination and filtering' })
  @ApiResponse({ status: 200, description: 'Paginated list of public tracks' })
  findPublic(@Query() filter: TrackFilterDto): Promise<PaginatedResult<Track>> {
    return this.tracksService.findPublic(filter);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search tracks by title or album' })
  @ApiQuery({ name: 'q', description: 'Search query', required: true })
  @ApiResponse({ status: 200, description: 'Paginated search results' })
  search(@Query('q') query: string, @Query() filter: TrackFilterDto): Promise<PaginatedResult<Track>> {
    if (!query) {
      throw new BadRequestException('Search query is required');
    }
    return this.tracksService.search(query, filter);
  }

  @Get('artist/:artistId')
  @ApiOperation({ summary: 'Get tracks by artist ID with pagination' })
  @ApiResponse({ status: 200, description: 'Paginated tracks by artist' })
  findByArtist(@Param('artistId', ParseUUIDPipe) artistId: string, @Query() filter: TrackFilterDto): Promise<PaginatedResult<Track>> {
    return this.tracksService.findByArtist(artistId, filter);
  }

  @Get('genre/:genre')
  @ApiOperation({ summary: 'Get tracks by genre with pagination' })
  @ApiResponse({ status: 200, description: 'Paginated tracks by genre' })
  findByGenre(@Param('genre') genre: string, @Query() filter: TrackFilterDto): Promise<PaginatedResult<Track>> {
    return this.tracksService.findByGenre(genre, filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a track by ID' })
  @ApiResponse({ status: 200, description: 'Track details', type: Track })
  @ApiResponse({ status: 404, description: 'Track not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Track> {
    return this.tracksService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a track' })
  @ApiResponse({ status: 200, description: 'Track updated successfully', type: Track })
  @ApiResponse({ status: 404, description: 'Track not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTrackDto: Partial<CreateTrackDto>,
  ): Promise<Track> {
    return this.tracksService.update(id, updateTrackDto);
  }

  @Patch(':id/play')
  @ApiOperation({ summary: 'Increment track play count' })
  @ApiResponse({ status: 200, description: 'Play count incremented', type: Track })
  @ApiResponse({ status: 404, description: 'Track not found' })
  incrementPlayCount(@Param('id', ParseUUIDPipe) id: string): Promise<Track> {
    return this.tracksService.incrementPlayCount(id);
  }

  @Patch(':id/tips')
  @ApiOperation({ summary: 'Add tips to track total' })
  @ApiResponse({ status: 200, description: 'Tips added successfully', type: Track })
  @ApiResponse({ status: 404, description: 'Track not found' })
  addTips(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('amount') amount: number,
  ): Promise<Track> {
    if (!amount || amount <= 0) {
      throw new BadRequestException('Valid tip amount is required');
    }
    return this.tracksService.addTips(id, amount);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a track' })
  @ApiResponse({ status: 200, description: 'Track deleted successfully' })
  @ApiResponse({ status: 404, description: 'Track not found' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.tracksService.remove(id);
  }
}
