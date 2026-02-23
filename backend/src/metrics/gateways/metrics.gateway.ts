import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { PrometheusService } from '../services/prometheus.service';

@Injectable()
@WebSocketGateway({ namespace: '/metrics', cors: true })
export class MetricsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private updateInterval: NodeJS.Timeout;

  constructor(private readonly prometheusService: PrometheusService) {}

  afterInit() {
    this.startMetricsBroadcast();
  }

  handleConnection(client: Socket) {
    console.log(`Metrics client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Metrics client disconnected: ${client.id}`);
  }

  private startMetricsBroadcast() {
    this.updateInterval = setInterval(async () => {
      const metrics = await this.collectRealtimeMetrics();
      this.server.emit('metrics:update', metrics);
    }, 2000); // Update every 2 seconds
  }

  private async collectRealtimeMetrics() {
    const memUsage = process.memoryUsage();
    
    return {
      timestamp: new Date().toISOString(),
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        rss: memUsage.rss,
        external: memUsage.external,
      },
      uptime: process.uptime(),
      // Add more real-time metrics as needed
    };
  }

  broadcastAlert(alert: { severity: string; message: string; timestamp: string }) {
    this.server.emit('metrics:alert', alert);
  }
}
