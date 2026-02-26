import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventsService } from './events.service';
import { ArtistEvent, ArtistEventType } from './entities/artist-event.entity';
import { EventRSVP } from './entities/event-rsvp.entity';
import { Artist } from '../artists/entities/artist.entity';
import { User } from '../users/entities/user.entity';
import { Follow, FollowingType } from '../follows/entities/follow.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { Repository } from 'typeorm';

describe('EventsService', () => {
  let service: EventsService;
  let artistEventRepo: jest.Mocked<Repository<ArtistEvent>>;
  let eventRsvpRepo: jest.Mocked<Repository<EventRSVP>>;
  let artistRepo: jest.Mocked<Repository<Artist>>;
  let userRepo: jest.Mocked<Repository<User>>;
  let followRepo: jest.Mocked<Repository<Follow>>;
  let notificationsService: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: getRepositoryToken(ArtistEvent),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findAndCount: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(EventRSVP),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
            findAndCount: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Artist),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Follow),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    artistEventRepo = module.get(getRepositoryToken(ArtistEvent));
    eventRsvpRepo = module.get(getRepositoryToken(EventRSVP));
    artistRepo = module.get(getRepositoryToken(Artist));
    userRepo = module.get(getRepositoryToken(User));
    followRepo = module.get(getRepositoryToken(Follow));
    notificationsService = module.get(NotificationsService);
  });

  it('rejects RSVP for past events', async () => {
    const pastEvent: ArtistEvent = {
      id: 'event1',
      artistId: 'artist1',
      artist: null as any,
      title: 'Past',
      description: '',
      eventType: ArtistEventType.CONCERT,
      startTime: new Date(Date.now() - 3600 * 1000),
      endTime: null,
      venue: null,
      streamUrl: null,
      ticketUrl: null,
      isVirtual: false,
      rsvpCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (artistEventRepo.findOne as jest.Mock).mockResolvedValue(pastEvent);

    await expect(
      service.rsvpToEvent('event1', 'user1'),
    ).rejects.toThrow('Cannot RSVP to past events');
  });

  it('increments and decrements RSVP count correctly', async () => {
    const future = new Date(Date.now() + 2 * 3600 * 1000);
    const event: ArtistEvent = {
      id: 'event2',
      artistId: 'artist1',
      artist: null as any,
      title: 'Future',
      description: '',
      eventType: ArtistEventType.CONCERT,
      startTime: future,
      endTime: null,
      venue: null,
      streamUrl: null,
      ticketUrl: null,
      isVirtual: false,
      rsvpCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (artistEventRepo.findOne as jest.Mock).mockResolvedValue(event);
    (eventRsvpRepo.findOne as jest.Mock).mockResolvedValue(null);
    (eventRsvpRepo.create as jest.Mock).mockReturnValue({
      id: 'rsvp1',
      eventId: 'event2',
      userId: 'user1',
      reminderEnabled: true,
      createdAt: new Date(),
    });
    (eventRsvpRepo.save as jest.Mock).mockImplementation(async (r) => r);
    (artistEventRepo.save as jest.Mock).mockImplementation(async (e) => e);

    const rsvp = await service.rsvpToEvent('event2', 'user1');

    expect(rsvp.eventId).toBe('event2');
    expect(event.rsvpCount).toBe(1);

    (eventRsvpRepo.findOne as jest.Mock).mockResolvedValue(rsvp);

    await service.cancelRsvp('event2', 'user1');

    expect(event.rsvpCount).toBe(0);
  });

  it('returns events only from followed artists in feed', async () => {
    const future = new Date(Date.now() + 2 * 3600 * 1000);
    const events: ArtistEvent[] = [
      {
        id: 'event3',
        artistId: 'artist-followed',
        artist: null as any,
        title: 'Followed Artist Event',
        description: '',
        eventType: ArtistEventType.LIVE_STREAM,
        startTime: future,
        endTime: null,
        venue: null,
        streamUrl: null,
        ticketUrl: null,
        isVirtual: true,
        rsvpCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    (followRepo.find as jest.Mock).mockResolvedValue([
      {
        id: 'f1',
        followerId: 'user1',
        followingId: 'artist-followed',
        followingType: FollowingType.ARTIST,
        notificationsEnabled: true,
        createdAt: new Date(),
      },
    ]);

    (artistEventRepo.findAndCount as jest.Mock).mockResolvedValue([events, 1]);

    const result = await service.getFeed('user1', { page: 1, limit: 10 });

    expect(result.total).toBe(1);
    expect(result.data[0].artistId).toBe('artist-followed');
  });
});
