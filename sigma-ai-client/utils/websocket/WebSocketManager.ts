import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { WebSocketConfig, WebSocketMessage, WebSocketResponse } from '../../types/websocket';
import { WEBSOCKET_CONFIG } from './config';

export class WebSocketManager {
  private client: Client;
  private config: WebSocketConfig;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number;
  private reconnectDelay: number;
  private responseCallbacks: Map<string, (response: WebSocketResponse) => void> = new Map();

  constructor(config: WebSocketConfig) {
    this.config = config;
    this.maxReconnectAttempts = config.reconnectAttempts || 5;
    this.reconnectDelay = config.reconnectDelay || 3000;

    this.client = new Client({
      webSocketFactory: () => {
        const sockjsUrl = `${config.serverUrl}${WEBSOCKET_CONFIG.WS_ENDPOINT}`;
        const options: any = {
          // Enable cookies for authentication
          withCredentials: true
        };
        
        // Add token to headers if provided (for JWT-based auth)
        if (config.token) {
          options.headers = {
            'Authorization': `Bearer ${config.token}`
          };
        }
        
        return new SockJS(sockjsUrl, null, options);
      },
      debug: (str) => {
      },
      reconnectDelay: this.reconnectDelay,
      heartbeatIncoming: WEBSOCKET_CONFIG.HEARTBEAT_INCOMING,
      heartbeatOutgoing: WEBSOCKET_CONFIG.HEARTBEAT_OUTGOING,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.onConnect = (frame) => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
    };

    this.client.onStompError = (frame) => {
      console.error('STOMP Error:', frame.headers['message'], frame.body);
      this.isConnected = false;
    };

    this.client.onWebSocketError = (error) => {
      console.error('WebSocket Error:', error);
      this.isConnected = false;
      this.attemptReconnect();
    };

    this.client.onDisconnect = () => {
      this.isConnected = false;
      this.attemptReconnect();
    };
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      
      setTimeout(() => {
        if (!this.isConnected) {
          this.connect();
        }
      }, this.reconnectDelay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  private handleResponse(response: WebSocketResponse): void {
    // Handle the response - this will be called by the chat handler
    const callback = this.responseCallbacks.get('default');
    if (callback) {
      callback(response);
    }
  }

  public clearResponseHandler(): void {
    this.responseCallbacks.delete('default');
  }

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnected) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 10000);

      this.client.onConnect = (frame) => {
        clearTimeout(timeout);
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Subscribe to response queue
        this.client.subscribe(WEBSOCKET_CONFIG.RECEIVE_DESTINATION, (message) => {
          try {
            this.handleResponse({ type: 'response', content: message.body, isComplete: false });
          } catch (_error) {
            console.error('Error parsing message:', _error);
          }
        });
        
        resolve();
      };

      this.client.activate();
    });
  }

  public disconnect(): void {
    this.client.deactivate();
    this.isConnected = false;
    this.responseCallbacks.clear();
  }

  public sendMessage(message: string, onResponse: (response: WebSocketResponse) => void): void {
    if (!this.isConnected) {
      console.error('WebSocket not connected');
      return;
    }

    // Store the callback for handling responses
    this.responseCallbacks.set('default', onResponse);

    // Send message to configured destination
    this.client.publish({
      destination: WEBSOCKET_CONFIG.SEND_DESTINATION,
      body: message,
    });
  }

  public isWebSocketConnected(): boolean {
    return this.isConnected;
  }
}
