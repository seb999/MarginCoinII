import * as signalR from '@microsoft/signalr';

export interface WebSocketStatus {
  symbol: string;
  status: string;
  message: string;
  interval: string;
}

export interface CandleUpdate {
  symbol: string;
  price: string;
  change: number;
}

export interface TradingData {
  [key: string]: any;
}

export interface ReplacementData {
  replaced: string;
  added: string;
  newScore: number;
  replacedScore: number;
}

class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  constructor() {
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl('/signalrhub')
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.setupConnectionHandlers();
  }

  private setupConnectionHandlers() {
    if (!this.connection) return;

    this.connection.onreconnecting(() => {
      console.log('SignalR reconnecting...');
    });

    this.connection.onreconnected(() => {
      console.log('SignalR reconnected');
    });

    this.connection.onclose(() => {
      console.log('SignalR connection closed');
    });
  }

  async start() {
    if (!this.connection) return;

    try {
      if (this.connection.state === signalR.HubConnectionState.Disconnected) {
        await this.connection.start();
        console.log('SignalR connected');
      }
    } catch (err) {
      console.error('Error starting SignalR connection:', err);
      setTimeout(() => this.start(), 5000);
    }
  }

  async stop() {
    if (!this.connection) return;

    try {
      await this.connection.stop();
      console.log('SignalR disconnected');
    } catch (err) {
      console.error('Error stopping SignalR connection:', err);
    }
  }

  on(eventName: string, callback: (data: any) => void) {
    if (!this.connection) {
      console.warn('SignalR connection not initialized');
      return;
    }

    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());

      console.log(`Registering SignalR listener for event: ${eventName}`);

      this.connection.on(eventName, (data: string) => {
        console.log(`Raw SignalR event '${eventName}' received:`, data);
        try {
          const parsed = JSON.parse(data);
          console.log(`Parsed ${eventName} data:`, parsed);
          const callbacks = this.listeners.get(eventName);
          callbacks?.forEach(cb => cb(parsed));
        } catch (err) {
          console.error(`Error parsing ${eventName} data:`, err, 'Raw data:', data);
        }
      });
    }

    this.listeners.get(eventName)?.add(callback);
  }

  off(eventName: string, callback: (data: any) => void) {
    const callbacks = this.listeners.get(eventName);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  getConnectionState(): signalR.HubConnectionState {
    return this.connection?.state ?? signalR.HubConnectionState.Disconnected;
  }
}

export const signalRService = new SignalRService();
