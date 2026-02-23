import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventsService } from './events.service';

/**
 * Fired every 5 minutes. Finds events starting in ~1 hour (55–65 min window)
 * that have not yet had reminders sent, and dispatches notifications.
 */
@Injectable()
export class EventReminderCron {
  private readonly logger = new Logger(EventReminderCron.name);

  constructor(
    private readonly eventsService: EventsService,
    // Inject your NotificationsService here when available:
    // private readonly notificationsService: NotificationsService,
  ) {}

  @Cron('*/5 * * * *') // every 5 minutes
  async handleEventReminders(): Promise<void> {
    this.logger.debug('Running event reminder cron...');

    try {
      const upcomingEvents = await this.eventsService.getEventsForReminder();

      if (!upcomingEvents.length) {
        this.logger.debug('No events need reminders right now');
        return;
      }

      this.logger.log(`Sending reminders for ${upcomingEvents.length} event(s)`);

      for (const event of upcomingEvents) {
        try {
          const rsvps = await this.eventsService.getRsvpsForEvent(event.id, true);

          this.logger.log(
            `Event "${event.title}" (${event.id}): notifying ${rsvps.length} attendees`,
          );

          // ── Dispatch notifications ───────────────────────────────────────
          // Replace the loop body below with your actual notification logic,
          // e.g.:  await this.notificationsService.send({ userId, type, payload })
          for (const rsvp of rsvps) {
            await this.sendReminderNotification(rsvp.userId, event.id, event.title, event.startTime);
          }

          // Mark done so we don't double-send
          await this.eventsService.markReminderSent(event.id);
          this.logger.log(`Reminder marked as sent for event ${event.id}`);
        } catch (eventError) {
          this.logger.error(
            `Failed to process reminders for event ${event.id}`,
            eventError instanceof Error ? eventError.stack : String(eventError),
          );
          // Continue processing remaining events
        }
      }
    } catch (error) {
      this.logger.error(
        'Event reminder cron failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Placeholder — wire this to your push/email/in-app notification service.
   */
  private async sendReminderNotification(
    userId: string,
    eventId: string,
    eventTitle: string,
    startTime: Date,
  ): Promise<void> {
    this.logger.debug(
      `[REMINDER] → userId=${userId}, event="${eventTitle}" (${eventId}) at ${startTime.toISOString()}`,
    );

    // Example integration point:
    // await this.notificationsService.create({
    //   userId,
    //   type: NotificationType.EVENT_REMINDER,
    //   title: `Starts in 1 hour: ${eventTitle}`,
    //   body: `Your event "${eventTitle}" starts at ${startTime.toLocaleTimeString()}.`,
    //   data: { eventId },
    // });
  }
}
