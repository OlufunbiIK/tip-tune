import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Collaboration } from './entities/collaboration.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { Track } from '../tracks/entities/track.entity';
import { Artist } from '../artists/entities/artist.entity';

export interface CollaborationInviteEvent {
  type: 'invite';
  collaborationId: string;
  userId: string; // invited user's id
  trackId: string;
  trackTitle: string;
  invitedBy: string;
  role: string;
  splitPercentage: number;
  message?: string;
}

export interface CollaborationResponseEvent {
  type: 'response';
  collaborationId: string;
  userId: string; // track owner's user id
  collaboratorName: string;
  trackTitle: string;
  status: string;
  reason?: string;
}

type CollaborationEvent = CollaborationInviteEvent | CollaborationResponseEvent;

@Injectable()
export class CollaborationOutboxService implements OnModuleInit {
  private readonly logger = new Logger(CollaborationOutboxService.name);
  private eventQueue: CollaborationEvent[] = [];

  constructor(
    @InjectRepository(Collaboration)
    private collaborationRepo: Repository<Collaboration>,
    @InjectRepository(Track)
    private trackRepo: Repository<Track>,
    @InjectRepository(Artist)
    private artistRepo: Repository<Artist>,
    private notificationsService: NotificationsService,
  ) {}

  onModuleInit() {
    // Process queue periodically or on events
    setInterval(() => this.processQueue(), 5000); // Process every 5 seconds
  }

  /**
   * Queue a collaboration invite notification
   */
  async queueInviteNotification(event: Omit<CollaborationInviteEvent, 'type'>): Promise<void> {
    this.eventQueue.push({ type: 'invite', ...event });
    this.logger.log(`Queued invite notification for collaboration ${event.collaborationId}`);
  }

  /**
   * Queue a collaboration response notification
   */
  async queueResponseNotification(event: Omit<CollaborationResponseEvent, 'type'>): Promise<void> {
    this.eventQueue.push({ type: 'response', ...event });
    this.logger.log(`Queued response notification for collaboration ${event.collaborationId}`);
  }

  /**
   * Process queued events (called post-commit)
   */
  private async processQueue(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    for (const event of events) {
      try {
        if (event.type === 'invite') {
          await this.notificationsService.sendCollaborationInvite({
            userId: event.userId,
            trackId: event.trackId,
            trackTitle: event.trackTitle,
            invitedBy: event.invitedBy,
            role: event.role,
            splitPercentage: event.splitPercentage,
            message: event.message,
          });
        } else if (event.type === 'response') {
          await this.notificationsService.sendCollaborationResponse({
            userId: event.userId,
            collaboratorName: event.collaboratorName,
            trackTitle: event.trackTitle,
            status: event.status,
            reason: event.reason,
          });
        }
      } catch (error) {
        this.logger.error(`Failed to send notification for event ${JSON.stringify(event)}: ${error.message}`);
        // Re-queue on failure
        this.eventQueue.push(event);
      }
    }
  }

  /**
   * Immediate processing for testing (bypass queue)
   */
  async processImmediately(): Promise<void> {
    await this.processQueue();
  }
}