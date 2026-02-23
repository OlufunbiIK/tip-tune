import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';

@WebSocketGateway({
  cors: {
    origin: '*', // Configure appropriately for production
  },
  namespace: 'notifications',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(private readonly authService: AuthService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        this.logger.warn(`Client ${client.id} tried to connect without token`);
        client.disconnect();
        return;
      }

      const user = await this.authService.verifyAccessToken(token);
      
      // Join user-specific room
      client.join(`user:${user.id}`);
      client.data.user = user;
      
      this.logger.log(`Client ${client.id} connected mapped to user ${user.id}`);
    } catch (error) {
      this.logger.warn(`Client ${client.id} failed authentication: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinArtistRoom')
  handleJoinArtistRoom(client: Socket, artistId: string) {
    client.join(`artist:${artistId}`);
    this.logger.log(`Client ${client.id} joined room artist:${artistId}`);
    return { event: 'joinedArtistRoom', data: artistId };
  }

  sendNotificationToUser(userId: string, payload: any) {
    this.server.to(`user:${userId}`).emit('notification', payload);
  }

  sendNotificationToArtist(artistId: string, payload: any) {
    this.server.to(`user:${artistId}`).emit('tipReceived', payload);
  }
}
