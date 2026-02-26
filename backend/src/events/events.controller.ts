import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { EventsPaginationDto } from './dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';
import { ArtistEvent } from './entities/artist-event.entity';
import { User } from '../users/entities/user.entity';

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Create a new artist event' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Event created successfully',
  })
  async createEvent(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateEventDto,
  ) {
    return this.eventsService.createEvent(user.userId, dto);
  }

  @Post(':eventId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Update an existing artist event' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Event updated successfully',
  })
  async updateEvent(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: Partial<CreateEventDto>,
  ) {
    return this.eventsService.updateEvent(user.userId, eventId, dto);
  }

  @Delete(':eventId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Delete an artist event' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Event deleted successfully',
  })
  async deleteEvent(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    await this.eventsService.deleteEvent(user.userId, eventId);
  }

  @Get('artist/:artistId')
  @ApiOperation({ summary: 'Get upcoming events for an artist' })
  @ApiParam({ name: 'artistId', description: 'Artist ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated artist events',
  })
  async getArtistEvents(
    @Param('artistId', ParseUUIDPipe) artistId: string,
    @Query() pagination: EventsPaginationDto,
  ): Promise<PaginatedResult<ArtistEvent>> {
    return this.eventsService.getArtistEvents(artistId, pagination);
  }

  @Get('feed')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Get upcoming events from followed artists' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated events from followed artists',
  })
  async getFeed(
    @CurrentUser() user: CurrentUserData,
    @Query() pagination: EventsPaginationDto,
  ): Promise<PaginatedResult<ArtistEvent>> {
    return this.eventsService.getFeed(user.userId, pagination);
  }

  @Post(':eventId/rsvp')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOperation({ summary: 'RSVP to an event' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'RSVP created',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot RSVP to past events',
  })
  async rsvp(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.eventsService.rsvpToEvent(eventId, user.userId);
  }

  @Delete(':eventId/rsvp')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Cancel RSVP to an event' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'RSVP cancelled',
  })
  async cancelRsvp(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    await this.eventsService.cancelRsvp(eventId, user.userId);
  }

  @Get(':eventId/attendees')
  @ApiOperation({ summary: 'Get event attendees' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated event attendees',
  })
  async getAttendees(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Query() pagination: EventsPaginationDto,
  ): Promise<PaginatedResult<User>> {
    return this.eventsService.getAttendees(eventId, pagination);
  }
}
