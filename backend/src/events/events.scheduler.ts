import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventsService } from './events.service';

@Injectable()
export class EventsScheduler {
  private readonly logger = new Logger(EventsScheduler.name);

  constructor(private readonly eventsService: EventsService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleReminders() {
    try {
      await this.eventsService.sendUpcomingEventReminders();
    } catch (error) {
      this.logger.error('Error sending event reminders', error);
    }
  }
}

