import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EventsService } from './events.service';
import { ArtistEvent, EventType } from './entities/artist-event.entity';
import { EventRSVP } from './entities/event-rsvp.entity';

const mockEventRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  find: jest.fn(),
  remove: jest.fn(),
  update: jest.fn(),
  increment: jest.fn(),
  decrement: jest.fn(),
});

const mockRsvpRepo = () => ({
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
});

const mockDataSource = () => ({
  transaction: jest.fn(),
});

const makeFutureDate = (offsetMs = 2 * 60 * 60 * 1000) =>
  new Date(Date.now() + offsetMs);

const makePastDate = (offsetMs = 2 * 60 * 60 * 1000) =>
  new Date(Date.now() - offsetMs);

const makeEvent = (overrides: Partial<ArtistEvent> = {}): ArtistEvent => ({
  id: 'event-uuid',
  artistId: 'artist-uuid',
  title: 'Test Event',
  description: 'A test',
  eventType: EventType.LIVE_STREAM,
  startTime: makeFutureDate(),
  endTime: null,
  venue: null,
  streamUrl: null,
  ticketUrl: null,
  isVirtual: false,
  rsvpCount: 0,
  reminderSent: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  rsvps: [],
  ...overrides,
});

describe('EventsService', () => {
  let service: EventsService;
  let eventRepo: jest.Mocked<Repository<ArtistEvent>>;
  let rsvpRepo: jest.Mocked<Repository<EventRSVP>>;
  let dataSource: jest.Mocked<DataSource>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: getRepositoryToken(ArtistEvent), useFactory: mockEventRepo },
        { provide: getRepositoryToken(EventRSVP), useFactory: mockRsvpRepo },
        { provide: DataSource, useFactory: mockDataSource },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    eventRepo = module.get(getRepositoryToken(ArtistEvent));
    rsvpRepo = module.get(getRepositoryToken(EventRSVP));
    dataSource = module.get(DataSource);
  });

  // ─── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create an event successfully', async () => {
      const dto = {
        title: 'Gig',
        description: 'Big gig',
        eventType: EventType.CONCERT,
        startTime: makeFutureDate().toISOString(),
        isVirtual: false,
      };
      const event = makeEvent();
      eventRepo.create.mockReturnValue(event);
      eventRepo.save.mockResolvedValue(event);

      const result = await service.create('artist-uuid', dto);
      expect(result).toEqual(event);
      expect(eventRepo.save).toHaveBeenCalledWith(event);
    });

    it('should throw BadRequestException for past startTime', async () => {
      const dto = {
        title: 'Old',
        description: 'Old event',
        eventType: EventType.CONCERT,
        startTime: makePastDate().toISOString(),
      };
      await expect(service.create('artist-uuid', dto)).rejects.toThrow(BadRequestException);
    });
  });

  // ─── findOne ─────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return an event', async () => {
      const event = makeEvent();
      eventRepo.findOne.mockResolvedValue(event);
      await expect(service.findOne('event-uuid')).resolves.toEqual(event);
    });

    it('should throw NotFoundException when event not found', async () => {
      eventRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── update ──────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update own event', async () => {
      const event = makeEvent();
      eventRepo.findOne.mockResolvedValue(event);
      eventRepo.save.mockResolvedValue({ ...event, title: 'Updated' });

      const result = await service.update('event-uuid', 'artist-uuid', { title: 'Updated' });
      expect(result.title).toBe('Updated');
    });

    it('should throw ForbiddenException for wrong artist', async () => {
      const event = makeEvent({ artistId: 'other-artist' });
      eventRepo.findOne.mockResolvedValue(event);

      await expect(
        service.update('event-uuid', 'artist-uuid', { title: 'X' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── remove ──────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should remove own event', async () => {
      const event = makeEvent();
      eventRepo.findOne.mockResolvedValue(event);
      eventRepo.remove.mockResolvedValue(event);
      await expect(service.remove('event-uuid', 'artist-uuid')).resolves.not.toThrow();
    });

    it('should throw ForbiddenException for wrong artist', async () => {
      const event = makeEvent({ artistId: 'other-artist' });
      eventRepo.findOne.mockResolvedValue(event);
      await expect(service.remove('event-uuid', 'artist-uuid')).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── rsvp ────────────────────────────────────────────────────────────────────

  describe('rsvp', () => {
    it('should create an RSVP and increment count', async () => {
      const event = makeEvent();
      const rsvp: EventRSVP = {
        id: 'rsvp-uuid',
        eventId: 'event-uuid',
        userId: 'user-uuid',
        reminderEnabled: true,
        createdAt: new Date(),
        event,
      };

      eventRepo.findOne.mockResolvedValue(event);
      rsvpRepo.findOne.mockResolvedValue(null);
      (dataSource.transaction as jest.Mock).mockImplementation(async (cb) =>
        cb({
          create: jest.fn().mockReturnValue(rsvp),
          save: jest.fn().mockResolvedValue(rsvp),
          increment: jest.fn().mockResolvedValue(undefined),
        }),
      );

      const result = await service.rsvp('event-uuid', 'user-uuid', { reminderEnabled: true });
      expect(result).toEqual(rsvp);
    });

    it('should throw BadRequestException for past event', async () => {
      const event = makeEvent({ startTime: makePastDate() });
      eventRepo.findOne.mockResolvedValue(event);

      await expect(service.rsvp('event-uuid', 'user-uuid', {})).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if already RSVPed', async () => {
      const event = makeEvent();
      const existingRsvp: EventRSVP = {
        id: 'existing',
        eventId: 'event-uuid',
        userId: 'user-uuid',
        reminderEnabled: true,
        createdAt: new Date(),
        event,
      };
      eventRepo.findOne.mockResolvedValue(event);
      rsvpRepo.findOne.mockResolvedValue(existingRsvp);

      await expect(service.rsvp('event-uuid', 'user-uuid', {})).rejects.toThrow(ConflictException);
    });
  });

  // ─── unRsvp ──────────────────────────────────────────────────────────────────

  describe('unRsvp', () => {
    it('should remove RSVP and decrement count', async () => {
      const event = makeEvent();
      const rsvp: EventRSVP = {
        id: 'rsvp-uuid', eventId: 'event-uuid', userId: 'user-uuid',
        reminderEnabled: true, createdAt: new Date(), event,
      };

      eventRepo.findOne.mockResolvedValue(event);
      rsvpRepo.findOne.mockResolvedValue(rsvp);
      (dataSource.transaction as jest.Mock).mockImplementation(async (cb) =>
        cb({
          remove: jest.fn().mockResolvedValue(undefined),
          decrement: jest.fn().mockResolvedValue(undefined),
        }),
      );

      await expect(service.unRsvp('event-uuid', 'user-uuid')).resolves.not.toThrow();
    });

    it('should throw BadRequestException for past event', async () => {
      const event = makeEvent({ startTime: makePastDate() });
      eventRepo.findOne.mockResolvedValue(event);
      await expect(service.unRsvp('event-uuid', 'user-uuid')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if RSVP does not exist', async () => {
      const event = makeEvent();
      eventRepo.findOne.mockResolvedValue(event);
      rsvpRepo.findOne.mockResolvedValue(null);
      await expect(service.unRsvp('event-uuid', 'user-uuid')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getFeed ─────────────────────────────────────────────────────────────────

  describe('getFeed', () => {
    it('should return empty when no followed artists', async () => {
      const result = await service.getFeed([], {});
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should return paginated upcoming events from followed artists', async () => {
      const event = makeEvent();
      eventRepo.findAndCount.mockResolvedValue([[event], 1]);

      const result = await service.getFeed(['artist-uuid'], { page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });
  });

  // ─── getEventsForReminder ────────────────────────────────────────────────────

  describe('getEventsForReminder', () => {
    it('should return events in the 1-hour reminder window', async () => {
      const event = makeEvent({ startTime: new Date(Date.now() + 58 * 60 * 1000) });
      eventRepo.find.mockResolvedValue([event]);

      const results = await service.getEventsForReminder();
      expect(results).toHaveLength(1);
      expect(eventRepo.find).toHaveBeenCalled();
    });
  });

  // ─── findByArtist pagination ─────────────────────────────────────────────────

  describe('findByArtist', () => {
    it('should apply pagination correctly', async () => {
      const events = [makeEvent(), makeEvent({ id: 'event-2' })];
      eventRepo.findAndCount.mockResolvedValue([events, 42]);

      const result = await service.findByArtist('artist-uuid', { page: 2, limit: 10 });
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(42);
      expect(result.totalPages).toBe(5);
    });
  });
});
