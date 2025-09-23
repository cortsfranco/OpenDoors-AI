import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { IncomingMessage } from 'http';

interface Client {
  ws: WebSocket;
  userId?: string;
  isAlive: boolean;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<WebSocket, Client> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  initialize(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    
    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const client: Client = {
        ws,
        isAlive: true,
      };
      
      this.clients.set(ws, client);
      console.log('New WebSocket connection established');
      
      // Send initial connection success message
      ws.send(JSON.stringify({ 
        type: 'connection', 
        message: 'Connected to real-time updates' 
      }));

      // Handle incoming messages
      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      });

      // Handle pong for heartbeat
      ws.on('pong', () => {
        const client = this.clients.get(ws);
        if (client) {
          client.isAlive = true;
        }
      });

      // Handle disconnection
      ws.on('close', () => {
        this.clients.delete(ws);
        console.log('WebSocket connection closed');
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });

    // Start heartbeat to keep connections alive
    this.startHeartbeat();
  }

  private handleMessage(ws: WebSocket, message: any) {
    const client = this.clients.get(ws);
    if (!client) return;

    switch (message.type) {
      case 'authenticate':
        // Associate the WebSocket with a user
        client.userId = message.userId;
        ws.send(JSON.stringify({ 
          type: 'authenticated', 
          userId: client.userId 
        }));
        break;
      
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
        
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client, ws) => {
        if (client.isAlive === false) {
          this.clients.delete(ws);
          ws.terminate();
          return;
        }
        
        client.isAlive = false;
        ws.ping();
      });
    }, 30000); // Ping every 30 seconds
  }

  // Broadcast to all connected clients
  broadcast(data: any) {
    const message = JSON.stringify(data);
    
    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    });
  }

  // Send to specific user(s)
  sendToUser(userId: string, data: any) {
    const message = JSON.stringify(data);
    
    this.clients.forEach((client) => {
      if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    });
  }

  // Send to all users except the sender
  broadcastExcept(excludeUserId: string, data: any) {
    const message = JSON.stringify(data);
    
    this.clients.forEach((client) => {
      if (client.userId !== excludeUserId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    });
  }

  // Notify about invoice changes
  notifyInvoiceChange(action: 'created' | 'updated' | 'deleted', invoice: any, userId?: string) {
    const notification = {
      type: `invoice_${action}`, // Send 'invoice_created', 'invoice_updated', 'invoice_deleted'
      data: invoice,
      userId,
      message: action === 'created' ? 'Nueva factura agregada' : 
               action === 'updated' ? 'Factura actualizada' : 
               'Factura eliminada',
      timestamp: new Date().toISOString(),
    };

    // If userId is provided, broadcast to everyone except the user who made the change
    if (userId) {
      this.broadcastExcept(userId, notification);
    } else {
      this.broadcast(notification);
    }
  }

  // Notify about client/provider changes
  notifyClientChange(action: 'created' | 'updated' | 'deleted', client: any, userId?: string) {
    const notification = {
      type: `client_${action}`, // Send 'client_created', 'client_updated', 'client_deleted'
      data: client,
      userId,
      message: action === 'created' ? 'Nuevo cliente agregado' : 
               action === 'updated' ? 'Cliente actualizado' : 
               'Cliente eliminado',
      timestamp: new Date().toISOString(),
    };

    // If userId is provided, broadcast to everyone except the user who made the change
    if (userId) {
      this.broadcastExcept(userId, notification);
    } else {
      this.broadcast(notification);
    }
  }

  // Notify about user activity
  notifyUserActivity(activity: string, userId: string, details?: any) {
    const notification = {
      type: 'user_activity',
      activity,
      userId,
      details,
      timestamp: new Date().toISOString(),
    };

    this.broadcast(notification);
  }

  // Notify about system events
  notifySystemEvent(event: string, details?: any) {
    const notification = {
      type: 'system_event',
      event,
      details,
      timestamp: new Date().toISOString(),
    };

    this.broadcast(notification);
  }

  // Notify about upload job status changes
  notifyUploadJobStatus(jobId: string, status: string, userId: string, error?: string, invoiceData?: any) {
    const notification = {
      type: `upload:${status}`,
      data: { 
        jobId, 
        status, 
        error,
        invoiceData 
      },
      message: `Upload ${status}`,
      timestamp: new Date().toISOString(),
    };

    // Send only to the user who uploaded the file
    this.sendToUser(userId, notification);
  }

  cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.clients.forEach((client, ws) => {
      ws.close();
    });
    
    this.clients.clear();
    
    if (this.wss) {
      this.wss.close();
    }
  }
}

export const wsManager = new WebSocketManager();