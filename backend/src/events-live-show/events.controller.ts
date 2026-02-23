import {
  Controller,
  Get,
  Post,
  Put,
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
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { EventsService } from './events.service';
import {
  CreateArtistEventDto,
  UpdateArtistEventDto,
  RsvpDto,
  PaginationQueryDto,
} from './dto/events.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // ─── CREATE EVENT ──────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create a new artist event' })
  @ApiResponse({ status: 201, description: 'Event created successfully' })
  async create(
    @CurrentUser('id') artistId: string,
    @Body() dto: CreateArtistEventDto,
  ) {
    return this.eventsService.create(artistId, dto);
  }

  // ─── GET EVENTS BY ARTIST ──────────────────────────────────────────────────

  @Get('artist/:artistId')
  @ApiOperation({ summary: 'Get all events for a specific artist' })
  @ApiParam({ name: 'artistId', type: 'string', format: 'uuid' })
  async findByArtist(
    @Param('artistId', ParseUUIDPipe) artistId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.eventsService.findByArtist(artistId, query);
  }

  // ─── FEED ──────────────────────────────────────────────────────────────────

  @Get('feed')
  @ApiOperation({ summary: 'Get upcoming events from followed artists' })
  async getFeed(
    @CurrentUser() user: { id: string; followedArtistIds?: string[] },
    @Query() query: PaginationQueryDto,
  ) {
    const followedArtistIds = user.followedArtistIds ?? [];
    return this.eventsService.getFeed(followedArtistIds, query);
  }

  // ─── GET SINGLE EVENT ──────────────────────────────────────────────────────

  @Get(':eventId')
  @ApiOperation({ summary: 'Get a single event by ID' })
  @ApiParam({ name: 'eventId', type: 'string', format: 'uuid' })
  async findOne(@Param('eventId', ParseUUIDPipe) eventId: string) {
    return this.eventsService.findOne(eventId);
  }

  // ─── UPDATE EVENT ──────────────────────────────────────────────────────────

  @Put(':eventId')
  @ApiOperation({ summary: 'Update an event (artist only)' })
  @ApiParam({ name: 'eventId', type: 'string', format: 'uuid' })
  async update(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser('id') artistId: string,
    @Body() dto: UpdateArtistEventDto,
  ) {
    return this.eventsService.update(eventId, artistId, dto);
  }

  // ─── DELETE EVENT ──────────────────────────────────────────────────────────

  @Delete(':eventId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an event (artist only)' })
  @ApiParam({ name: 'eventId', type: 'string', format: 'uuid' })
  async remove(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser('id') artistId: string,
  ) {
    return this.eventsService.remove(eventId, artistId);
  }

  // ─── RSVP ──────────────────────────────────────────────────────────────────

  @Post(':eventId/rsvp')
  @ApiOperation({ summary: 'RSVP to an event' })
  @ApiParam({ name: 'eventId', type: 'string', format: 'uuid' })
  async rsvp(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: RsvpDto,
  ) {
    return this.eventsService.rsvp(eventId, userId, dto);
  }

  // ─── UN-RSVP ───────────────────────────────────────────────────────────────

  @Delete(':eventId/rsvp')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel RSVP from an event' })
  @ApiParam({ name: 'eventId', type: 'string', format: 'uuid' })
  async unRsvp(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.eventsService.unRsvp(eventId, userId);
  }

  // ─── ATTENDEES ─────────────────────────────────────────────────────────────

  @Get(':eventId/attendees')
  @ApiOperation({ summary: 'Get list of attendees for an event' })
  @ApiParam({ name: 'eventId', type: 'string', format: 'uuid' })
  async getAttendees(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.eventsService.getAttendees(eventId, query);
  }
}
