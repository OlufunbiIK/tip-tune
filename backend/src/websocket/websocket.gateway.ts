import {
  WebSocketGateway as WSGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger } from "@nestjs/common";
import { Tip } from "../tips/entities/tip.entity";

export interface TipNotificationData {
  type: "tip_received";
  data: {
    tipId: string;
    artistId: string;
    trackId?: string;
    amount: number;
    asset: string;
    message?: string;
    senderAddress?: string;
    isAnonymous: boolean;
    createdAt: Date;
    artist?: any;
    track?: any;
  };
}

@WSGateway({
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
  namespace: "/tips",
})
export class WebSocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebSocketGateway.name);
  private connectedClients: Map<string, Socket> = new Map();

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
    this.connectedClients.set(client.id, client);

    // Send welcome message
    client.emit("connected", {
      message: "Connected to TipTune WebSocket",
      clientId: client.id,
    });
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
  }

  @SubscribeMessage("join_artist_room")
  handleJoinArtistRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { artistId: string },
  ): void {
    const room = `artist_${data.artistId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} joined room: ${room}`);

    client.emit("joined_room", { room, artistId: data.artistId });
  }

  @SubscribeMessage("leave_artist_room")
  handleLeaveArtistRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { artistId: string },
  ): void {
    const room = `artist_${data.artistId}`;
    client.leave(room);
    this.logger.log(`Client ${client.id} left room: ${room}`);

    client.emit("left_room", { room, artistId: data.artistId });
  }

  @SubscribeMessage("join_track_room")
  handleJoinTrackRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { trackId: string },
  ): void {
    const room = `track_${data.trackId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} joined room: ${room}`);

    client.emit("joined_room", { room, trackId: data.trackId });
  }

  @SubscribeMessage("leave_track_room")
  handleLeaveTrackRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { trackId: string },
  ): void {
    const room = `track_${data.trackId}`;
    client.leave(room);
    this.logger.log(`Client ${client.id} left room: ${room}`);

    client.emit("left_room", { room, trackId: data.trackId });
  }

  @SubscribeMessage("ping")
  handlePing(@ConnectedSocket() client: Socket): void {
    client.emit("pong", { timestamp: new Date() });
  }

  /**
   * Send tip notification to relevant rooms
   */
  async sendTipNotification(tip: Tip): Promise<void> {
    try {
      const notificationData: TipNotificationData = {
        type: "tip_received",
        data: {
          tipId: tip.id,
          artistId: tip.artistId,
          trackId: tip.trackId,
          amount: tip.amount,
          asset: tip.asset,
          message: tip.message,
          senderAddress: tip.isAnonymous ? undefined : tip.senderAddress,
          isAnonymous: tip.isAnonymous,
          createdAt: tip.createdAt,
          artist: tip.artist,
          track: tip.track,
        },
      };

      // Send to artist room
      const artistRoom = `artist_${tip.artistId}`;
      this.server.to(artistRoom).emit("tip_notification", notificationData);
      this.logger.log(`Sent tip notification to room: ${artistRoom}`);

      // Send to track room if track is specified
      if (tip.trackId) {
        const trackRoom = `track_${tip.trackId}`;
        this.server.to(trackRoom).emit("tip_notification", notificationData);
        this.logger.log(`Sent tip notification to room: ${trackRoom}`);
      }

      // Send to all connected clients for global notifications
      this.server.emit("global_tip_notification", notificationData);
      this.logger.log(`Sent global tip notification`);
    } catch (error) {
      this.logger.error(`Failed to send tip notification: ${error.message}`);
    }
  }

  /**
   * Send general notification
   */
  async sendNotification(
    event: string,
    data: any,
    room?: string,
  ): Promise<void> {
    try {
      if (room) {
        this.server.to(room).emit(event, data);
        this.logger.log(`Sent notification to room ${room}: ${event}`);
      } else {
        this.server.emit(event, data);
        this.logger.log(`Sent global notification: ${event}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send notification: ${error.message}`);
    }
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  /**
   * Get room members count
   */
  getRoomMembersCount(room: string): number {
    const roomSockets = this.server.sockets.adapter.rooms.get(room);
    return roomSockets ? roomSockets.size : 0;
  }

  /**
   * Broadcast system message
   */
  async broadcastSystemMessage(
    message: string,
    type: "info" | "warning" | "error" = "info",
  ): Promise<void> {
    const data = {
      type: "system_message",
      message,
      messageType: type,
      timestamp: new Date(),
    };

    await this.sendNotification("system_message", data);
    this.logger.log(`Broadcast system message: ${message}`);
  }
}
