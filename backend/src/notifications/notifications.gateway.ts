import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger } from "@nestjs/common";

@WebSocketGateway({
  cors: {
    origin: "*", // Configure appropriately for production
  },
  namespace: "notifications",
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    // Authentication logic could go here to verify user and join specific rooms
    const userId = client.handshake.query.userId as string;
    if (userId) {
      client.join(`user:${userId}`);
      this.logger.log(`Client ${client.id} joined room user:${userId}`);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage("joinArtistRoom")
  handleJoinArtistRoom(client: Socket, artistId: string) {
    client.join(`artist:${artistId}`);
    this.logger.log(`Client ${client.id} joined room artist:${artistId}`);
    return { event: "joinedArtistRoom", data: artistId };
  }

  sendNotificationToUser(userId: string, payload: any) {
    this.server.to(`user:${userId}`).emit("notification", payload);
  }

  sendNotificationToArtist(artistId: string, payload: any) {
    this.server.to(`artist:${artistId}`).emit("tipReceived", payload);
  }
}
