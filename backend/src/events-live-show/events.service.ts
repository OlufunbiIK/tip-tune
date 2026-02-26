import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, MoreThan, In, LessThanOrEqual, MoreThanOrEqual, Between } from 'typeorm';
import { ArtistEvent } from './entities/artist-event.entity';
import { EventRSVP } from './entities/event-rsvp.entity';
import {
  CreateArtistEventDto,
  UpdateArtistEventDto,
  RsvpDto,
  PaginationQueryDto,
} from './dto/events.dto';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(ArtistEvent)
    private readonly eventRepo: Repository<ArtistEvent>,
    @InjectRepository(EventRSVP)
    private readonly rsvpRepo: Repository<EventRSVP>,
    private readonly dataSource: DataSource,
  ) {}

  // ─── CRUD ───────────────────────────────────────────────────────────────────

  async create(artistId: string, dto: CreateArtistEventDto): Promise<ArtistEvent> {
    const startTime = new Date(dto.startTime);
    if (startTime <= new Date()) {
      throw new BadRequestException('Event start time must be in the future');
    }

    const event = this.eventRepo.create({
      ...dto,
      artistId,
      startTime,
      endTime: dto.endTime ? new Date(dto.endTime) : null,
    });

    return this.eventRepo.save(event);
  }

  async findByArtist(
    artistId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<ArtistEvent>> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const [data, total] = await this.eventRepo.findAndCount({
      where: { artistId },
      order: { startTime: 'ASC' },
      skip,
      take: limit,
    });

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string): Promise<ArtistEvent> {
    const event = await this.eventRepo.findOne({ where: { id } });
    if (!event) throw new NotFoundException(`Event ${id} not found`);
    return event;
  }

  async update(
    id: string,
    artistId: string,
    dto: UpdateArtistEventDto,
  ): Promise<ArtistEvent> {
    const event = await this.findOne(id);

    if (event.artistId !== artistId) {
      throw new ForbiddenException('You can only update your own events');
    }

    if (dto.startTime) {
      const startTime = new Date(dto.startTime);
      if (startTime <= new Date()) {
        throw new BadRequestException('Event start time must be in the future');
      }
      event.startTime = startTime;
    }

    if (dto.endTime) event.endTime = new Date(dto.endTime);

    Object.assign(event, {
      title: dto.title ?? event.title,
      description: dto.description ?? event.description,
      eventType: dto.eventType ?? event.eventType,
      venue: dto.venue ?? event.venue,
      streamUrl: dto.streamUrl ?? event.streamUrl,
      ticketUrl: dto.ticketUrl ?? event.ticketUrl,
      isVirtual: dto.isVirtual ?? event.isVirtual,
    });

    return this.eventRepo.save(event);
  }

  async remove(id: string, artistId: string): Promise<void> {
    const event = await this.findOne(id);
    if (event.artistId !== artistId) {
      throw new ForbiddenException('You can only delete your own events');
    }
    await this.eventRepo.remove(event);
  }

  // ─── RSVP ───────────────────────────────────────────────────────────────────

  async rsvp(eventId: string, userId: string, dto: RsvpDto): Promise<EventRSVP> {
    const event = await this.findOne(eventId);

    if (event.startTime <= new Date()) {
      throw new BadRequestException('Cannot RSVP to a past event');
    }

    const existing = await this.rsvpRepo.findOne({
      where: { eventId, userId },
    });
    if (existing) {
      throw new ConflictException('You have already RSVPed to this event');
    }

    return this.dataSource.transaction(async (manager) => {
      const rsvp = manager.create(EventRSVP, {
        eventId,
        userId,
        reminderEnabled: dto.reminderEnabled ?? true,
      });
      await manager.save(rsvp);
      await manager.increment(ArtistEvent, { id: eventId }, 'rsvpCount', 1);
      return rsvp;
    });
  }

  async unRsvp(eventId: string, userId: string): Promise<void> {
    const event = await this.findOne(eventId);

    if (event.startTime <= new Date()) {
      throw new BadRequestException('Cannot un-RSVP from a past event');
    }

    const rsvp = await this.rsvpRepo.findOne({ where: { eventId, userId } });
    if (!rsvp) throw new NotFoundException('RSVP not found');

    await this.dataSource.transaction(async (manager) => {
      await manager.remove(rsvp);
      await manager.decrement(ArtistEvent, { id: eventId }, 'rsvpCount', 1);
    });
  }

  async getAttendees(
    eventId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<EventRSVP>> {
    await this.findOne(eventId); // ensure event exists

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const [data, total] = await this.rsvpRepo.findAndCount({
      where: { eventId },
      order: { createdAt: 'ASC' },
      skip,
      take: limit,
    });

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ─── FEED ───────────────────────────────────────────────────────────────────

  async getFeed(
    followedArtistIds: string[],
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<ArtistEvent>> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    if (!followedArtistIds.length) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    const [data, total] = await this.eventRepo.findAndCount({
      where: {
        artistId: In(followedArtistIds),
        startTime: MoreThan(new Date()),
      },
      order: { startTime: 'ASC' },
      skip,
      take: limit,
    });

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ─── REMINDER CRON ──────────────────────────────────────────────────────────

  async getEventsForReminder(): Promise<ArtistEvent[]> {
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    // Window: events starting between now+55min and now+65min (10-min window to avoid missed runs)
    const windowStart = new Date(now.getTime() + 55 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 65 * 60 * 1000);

    return this.eventRepo.find({
      where: {
        startTime: Between(windowStart, windowEnd),
        reminderSent: false,
      },
    });
  }

  async getRsvpsForEvent(eventId: string, reminderEnabled = true): Promise<EventRSVP[]> {
    return this.rsvpRepo.find({ where: { eventId, reminderEnabled } });
  }

  async markReminderSent(eventId: string): Promise<void> {
    await this.eventRepo.update(eventId, { reminderSent: true });
  }
}
