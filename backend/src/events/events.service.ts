import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThan } from 'typeorm';
import { ArtistEvent } from './entities/artist-event.entity';
import { EventRSVP } from './entities/event-rsvp.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { EventsPaginationDto } from './dto/pagination.dto';
import { Artist } from '../artists/entities/artist.entity';
import { User } from '../users/entities/user.entity';
import { Follow, FollowingType } from '../follows/entities/follow.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification.entity';

interface PaginatedResult<T> {
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
    private readonly artistEventRepo: Repository<ArtistEvent>,
    @InjectRepository(EventRSVP)
    private readonly eventRsvpRepo: Repository<EventRSVP>,
    @InjectRepository(Artist)
    private readonly artistRepo: Repository<Artist>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Follow)
    private readonly followRepo: Repository<Follow>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createEvent(
    userId: string,
    dto: CreateEventDto,
  ): Promise<ArtistEvent> {
    const artist = await this.artistRepo.findOne({
      where: { id: dto.artistId },
    });

    if (!artist) {
      throw new NotFoundException('Artist not found');
    }

    if (artist.userId !== userId) {
      throw new ForbiddenException('You can only create events for your artist profile');
    }

    const startTime = new Date(dto.startTime);
    const endTime = dto.endTime ? new Date(dto.endTime) : null;

    if (Number.isNaN(startTime.getTime())) {
      throw new BadRequestException('Invalid startTime');
    }

    if (endTime && endTime <= startTime) {
      throw new BadRequestException('endTime must be after startTime');
    }

    const event = this.artistEventRepo.create({
      artistId: dto.artistId,
      title: dto.title,
      description: dto.description,
      eventType: dto.eventType,
      startTime,
      endTime,
      venue: dto.venue ?? null,
      streamUrl: dto.streamUrl ?? null,
      ticketUrl: dto.ticketUrl ?? null,
      isVirtual: dto.isVirtual ?? false,
    });

    return this.artistEventRepo.save(event);
  }

  async updateEvent(
    userId: string,
    eventId: string,
    dto: Partial<CreateEventDto>,
  ): Promise<ArtistEvent> {
    const event = await this.getEventById(eventId);

    const artist = await this.artistRepo.findOne({
      where: { id: event.artistId },
    });

    if (!artist || artist.userId !== userId) {
      throw new ForbiddenException('You can only update your own events');
    }

    if (dto.startTime) {
      const startTime = new Date(dto.startTime);
      if (Number.isNaN(startTime.getTime())) {
        throw new BadRequestException('Invalid startTime');
      }
      event.startTime = startTime;
    }

    if (dto.endTime) {
      const endTime = new Date(dto.endTime);
      if (Number.isNaN(endTime.getTime())) {
        throw new BadRequestException('Invalid endTime');
      }
      if (endTime <= event.startTime) {
        throw new BadRequestException('endTime must be after startTime');
      }
      event.endTime = endTime;
    }

    if (dto.title !== undefined) {
      event.title = dto.title;
    }

    if (dto.description !== undefined) {
      event.description = dto.description;
    }

    if (dto.eventType !== undefined) {
      event.eventType = dto.eventType;
    }

    if (dto.venue !== undefined) {
      event.venue = dto.venue ?? null;
    }

    if (dto.streamUrl !== undefined) {
      event.streamUrl = dto.streamUrl ?? null;
    }

    if (dto.ticketUrl !== undefined) {
      event.ticketUrl = dto.ticketUrl ?? null;
    }

    if (dto.isVirtual !== undefined) {
      event.isVirtual = dto.isVirtual;
    }

    return this.artistEventRepo.save(event);
  }

  async deleteEvent(userId: string, eventId: string): Promise<void> {
    const event = await this.getEventById(eventId);

    const artist = await this.artistRepo.findOne({
      where: { id: event.artistId },
    });

    if (!artist || artist.userId !== userId) {
      throw new ForbiddenException('You can only delete your own events');
    }

    await this.artistEventRepo.remove(event);
  }

  async getArtistEvents(
    artistId: string,
    pagination: EventsPaginationDto,
  ): Promise<PaginatedResult<ArtistEvent>> {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const now = new Date();

    const [events, total] = await this.artistEventRepo.findAndCount({
      where: {
        artistId,
        startTime: MoreThan(now),
      },
      order: { startTime: 'ASC' },
      skip,
      take: limit,
    });

    return {
      data: events,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getEventById(id: string): Promise<ArtistEvent> {
    const event = await this.artistEventRepo.findOne({ where: { id } });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    return event;
  }

  async getFeed(
    userId: string,
    pagination: EventsPaginationDto,
  ): Promise<PaginatedResult<ArtistEvent>> {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const follows = await this.followRepo.find({
      where: {
        followerId: userId,
        followingType: FollowingType.ARTIST,
      },
    });

    if (follows.length === 0) {
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    const artistIds = follows.map((f) => f.followingId);
    const now = new Date();

    const [events, total] = await this.artistEventRepo.findAndCount({
      where: {
        artistId: In(artistIds),
        startTime: MoreThan(now),
      },
      order: { startTime: 'ASC' },
      skip,
      take: limit,
    });

    return {
      data: events,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async rsvpToEvent(eventId: string, userId: string): Promise<EventRSVP> {
    const event = await this.getEventById(eventId);

    const now = new Date();
    if (event.startTime <= now) {
      throw new BadRequestException('Cannot RSVP to past events');
    }

    const existing = await this.eventRsvpRepo.findOne({
      where: { eventId, userId },
    });

    if (existing) {
      return existing;
    }

    const rsvp = this.eventRsvpRepo.create({
      eventId,
      userId,
      reminderEnabled: true,
    });

    const saved = await this.eventRsvpRepo.save(rsvp);

    event.rsvpCount += 1;
    await this.artistEventRepo.save(event);

    return saved;
  }

  async cancelRsvp(eventId: string, userId: string): Promise<void> {
    const rsvp = await this.eventRsvpRepo.findOne({
      where: { eventId, userId },
    });

    if (!rsvp) {
      throw new NotFoundException('RSVP not found');
    }

    await this.eventRsvpRepo.remove(rsvp);

    const event = await this.artistEventRepo.findOne({ where: { id: eventId } });
    if (event && event.rsvpCount > 0) {
      event.rsvpCount -= 1;
      await this.artistEventRepo.save(event);
    }
  }

  async getAttendees(
    eventId: string,
    pagination: EventsPaginationDto,
  ): Promise<PaginatedResult<User>> {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const [rsvps, total] = await this.eventRsvpRepo.findAndCount({
      where: { eventId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
      skip,
      take: limit,
    });

    const attendees = rsvps.map((r) => r.user);

    return {
      data: attendees,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async sendUpcomingEventReminders() {
    const now = new Date();
    const from = new Date(now.getTime() + 60 * 60 * 1000);
    const to = new Date(now.getTime() + 61 * 60 * 1000);

    const rsvps = await this.eventRsvpRepo
      .createQueryBuilder('rsvp')
      .innerJoinAndSelect('rsvp.event', 'event')
      .where('rsvp.reminderEnabled = :enabled', { enabled: true })
      .andWhere('event.startTime >= :from AND event.startTime < :to', {
        from,
        to,
      })
      .getMany();

    for (const rsvp of rsvps) {
      const event = rsvp.event;

      await this.notificationsService.create({
        userId: rsvp.userId,
        type: NotificationType.SYSTEM,
        title: 'Event starting soon',
        message: `The event "${event.title}" starts in 1 hour`,
        data: {
          eventId: event.id,
          artistId: event.artistId,
          startTime: event.startTime,
        },
      });
    }
  }
}
