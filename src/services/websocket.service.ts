//services/websocket.service.ts
import { Server as SocketServer } from 'socket.io';
import { Server } from 'http';
import aggregationService from './aggregation.service';
import { TokenData } from '../types/token.types';

class WebSocketService {
  private io!: SocketServer;
  private updateInterval: NodeJS.Timeout | null = null;

  initialize(server: Server) {
    this.io = new SocketServer(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('subscribe', async () => {
        const tokens = await aggregationService.aggregateTokens();
        socket.emit('initial-data', tokens);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });

    this.startPeriodicUpdates();
  }

  private startPeriodicUpdates() {
    this.updateInterval = setInterval(async () => {
      try {
        const tokens = await aggregationService.aggregateTokens(true);
        this.io.emit('price-update', tokens);
      } catch (error) {
        console.error('Error during periodic update:', error);
      }
    }, 30000); // Update every 30 seconds
  }

  broadcastUpdate(data: TokenData[]) {
    this.io.emit('price-update', data);
  }

  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}

export default new WebSocketService();
