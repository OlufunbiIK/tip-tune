import { Test, TestingModule } from '@nestjs/testing';
import { EventReminderCron } from './events-reminder.cron';
import { EventsService } from './events.service';
import { ArtistEvent, EventType } from './entities/artist-event.entity';
import { EventRSVP } from './entities/event-rsvp.entity';

const makeEvent = (id = 'event-1'): ArtistEvent => ({
  id,
  artistId: 'artist-uuid',
  title: 'Live Show',
  description: 'A live show',
  eventType: EventType.LIVE_STREAM,
  startTime: new Date(Date.now() + 60 * 60 * 1000),
  endTime: null,
  venue: null,
  streamUrl: null,
  ticketUrl: null,
  isVirtual: true,
  rsvpCount: 2,
  reminderSent: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  rsvps: [],
});

describe('EventReminderCron', () => {
  let cron: EventReminderCron;
  let eventsService: jest.Mocked<EventsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventReminderCron,
        {
          provide: EventsService,
          useValue: {
            getEventsForReminder: jest.fn(),
            getRsvpsForEvent: jest.fn(),
            markReminderSent: jest.fn(),
          },
        },
      ],
    }).compile();

    cron = module.get<EventReminderCron>(EventReminderCron);
    eventsService = module.get(EventsService);
  });

  it('should do nothing when no events need reminders', async () => {
    eventsService.getEventsForReminder.mockResolvedValue([]);

    await cron.handleEventReminders();

    expect(eventsService.getRsvpsForEvent).not.toHaveBeenCalled();
    expect(eventsService.markReminderSent).not.toHaveBeenCalled();
  });

  it('should send reminders for all attendees and mark event done', async () => {
    const event = makeEvent('event-1');
    const rsvps: EventRSVP[] = [
      { id: 'r1', eventId: 'event-1', userId: 'user-1', reminderEnabled: true, createdAt: new Date(), event },
      { id: 'r2', eventId: 'event-1', userId: 'user-2', reminderEnabled: true, createdAt: new Date(), event },
    ];

    eventsService.getEventsForReminder.mockResolvedValue([event]);
    eventsService.getRsvpsForEvent.mockResolvedValue(rsvps);
    eventsService.markReminderSent.mockResolvedValue();

    await cron.handleEventReminders();

    expect(eventsService.getRsvpsForEvent).toHaveBeenCalledWith('event-1', true);
    expect(eventsService.markReminderSent).toHaveBeenCalledWith('event-1');
  });

  it('should continue processing other events if one fails', async () => {
    const event1 = makeEvent('event-1');
    const event2 = makeEvent('event-2');

    eventsService.getEventsForReminder.mockResolvedValue([event1, event2]);
    eventsService.getRsvpsForEvent
      .mockRejectedValueOnce(new Error('DB Error'))
      .mockResolvedValueOnce([]);
    eventsService.markReminderSent.mockResolvedValue();

    await expect(cron.handleEventReminders()).resolves.not.toThrow();
    expect(eventsService.markReminderSent).toHaveBeenCalledWith('event-2');
    expect(eventsService.markReminderSent).not.toHaveBeenCalledWith('event-1');
  });

  it('should handle top-level errors gracefully', async () => {
    eventsService.getEventsForReminder.mockRejectedValue(new Error('Connection error'));
    await expect(cron.handleEventReminders()).resolves.not.toThrow();
  });
});
