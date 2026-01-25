import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { NotificationsGateway } from "./notifications.gateway";
import { Notification, NotificationType } from "./notification.entity";

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async notifyArtistOfTip(artistId: string, tip: any) {
    const title = "New Tip Received!";
    const message = `You received a tip of ${tip.amount} XLM!`;
    const data = {
      tipId: tip.id,
      amount: tip.amount,
      senderId: tip.fromUserId,
      stellarTxHash: tip.stellarTxHash,
    };

    // Save notification to DB
    const notification = this.notificationRepository.create({
      userId: artistId,
      type: NotificationType.TIP_RECEIVED,
      title,
      message,
      data,
    });

    const savedNotification =
      await this.notificationRepository.save(notification);

    // Emit via WebSocket
    this.notificationsGateway.sendNotificationToArtist(artistId, {
      ...savedNotification,
      type: "TIP_RECEIVED", // Ensure frontend gets the string it expects if consistent with enum
    });
  }

  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const [notifications, total] =
      await this.notificationRepository.findAndCount({
        where: { userId },
        order: { createdAt: "DESC" },
        skip: (page - 1) * limit,
        take: limit,
      });

    return {
      data: notifications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUnreadCount(userId: string) {
    const count = await this.notificationRepository.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.notificationRepository.findOne({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException("Notification not found");
    }

    notification.isRead = true;
    return this.notificationRepository.save(notification);
  }

  async markAllAsRead(userId: string) {
    await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true },
    );
    return { success: true };
  }
}
