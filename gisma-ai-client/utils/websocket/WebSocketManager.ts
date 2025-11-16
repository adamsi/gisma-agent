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
  private metadataCallbacks: Map<string, (response: any) => void> = new Map();
  private subscriptions: Map<string, any> = new Map();

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

  public abort(): void {
    // Unsubscribe from all subscriptions
    this.subscriptions.forEach((subscription) => {
      try {
        subscription.unsubscribe();
      } catch (error) {
        console.error('Error unsubscribing from WebSocket:', error);
      }
    });
    this.subscriptions.clear();
    
    // Clear response handlers
    this.responseCallbacks.clear();
    this.metadataCallbacks.clear();
    
    // Disconnect the WebSocket to stop the stream
    if (this.isConnected) {
      try {
        this.client.deactivate();
        this.isConnected = false;
      } catch (error) {
        console.error('Error disconnecting WebSocket:', error);
      }
    }
  }

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnected) {
        resolve();
        return;
      } 

      const timeout = setTimeout(() => {
        console.error(`WebSocket connection timeout after ${WEBSOCKET_CONFIG.CONNECTION_TIMEOUT / 1000} seconds`);
        reject(new Error(`Connection timeout - Server may be unreachable or overloaded (${WEBSOCKET_CONFIG.CONNECTION_TIMEOUT / 1000}s)`));
      }, WEBSOCKET_CONFIG.CONNECTION_TIMEOUT);

      this.client.onConnect = (frame) => {
        clearTimeout(timeout);
        this.isConnected = true;
        this.reconnectAttempts = 0;
        resolve();
      };

      this.client.onStompError = (frame) => {
        clearTimeout(timeout);
        console.error('STOMP Error:', frame.headers['message'], frame.body);
        this.isConnected = false;
        reject(new Error(`STOMP Error: ${frame.headers['message'] || 'Unknown error'}`));
      };

      this.client.onWebSocketError = (error) => {
        clearTimeout(timeout);
        console.error('WebSocket Error:', error);
        this.isConnected = false;
        reject(new Error(`WebSocket Error: ${error.message || 'Connection failed'}`));
      };

      try {
        this.client.activate();
      } catch (error) {
        clearTimeout(timeout);
        console.error('Failed to activate WebSocket client:', error);
        reject(new Error(`Failed to activate WebSocket: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  }

  public disconnect(): void {
    this.subscriptions.forEach((subscription) => {
      try {
        subscription.unsubscribe();
      } catch (error) {
        console.error('Error unsubscribing from WebSocket:', error);
      }
    });
    this.subscriptions.clear();
    
    this.client.deactivate();
    this.isConnected = false;
    this.responseCallbacks.clear();
    this.metadataCallbacks.clear();
  }

  public unsubscribe(destination: string): void {
    const subscription = this.subscriptions.get(destination);
    if (subscription) {
      try {
        subscription.unsubscribe();
        this.subscriptions.delete(destination);
      } catch (error) {
        console.error(`Error unsubscribing from ${destination}:`, error);
      }
    }
  }

  public subscribeToReply(
    destination: string,
    onResponse: (response: WebSocketResponse) => void,
    callbackKey: string = 'default'
  ): void {
    if (!this.isConnected) {
      console.error('WebSocket not connected');
      return;
    }

    this.unsubscribe(destination);
    this.responseCallbacks.set(callbackKey, onResponse);

    const subscription = this.client.subscribe(destination, (message) => {
      try {
        const callback = this.responseCallbacks.get(callbackKey);
        if (callback) {
          // Check if message body is empty or indicates completion
          const isComplete = !message.body || message.body.trim() === '' || message.body === '[DONE]';
          callback({ type: 'response', content: message.body || '', isComplete });
        }
      } catch (_error) {
        console.error('Error parsing message:', _error);
      }
    });

    this.subscriptions.set(destination, subscription);
  }

  public subscribeToMetadata(
    onMetadata: (response: any) => void,
    callbackKey: string = 'default'
  ): void {
    if (!this.isConnected) {
      console.error('WebSocket not connected');
      return;
    }

    const destination = WEBSOCKET_CONFIG.RECEIVE_METADATA_DESTINATION;
    this.unsubscribe(destination);
    this.metadataCallbacks.set(callbackKey, onMetadata);

    const subscription = this.client.subscribe(destination, (message) => {
      try {
        const metadata = JSON.parse(message.body);
        const callback = this.metadataCallbacks.get(callbackKey);
        if (callback) {
          callback(metadata);
        }
      } catch (_error) {
        console.error('Error parsing metadata:', _error);
      }
    });

    this.subscriptions.set(destination, subscription);
  }

  public sendMessage(message: string, destination: string = WEBSOCKET_CONFIG.SEND_DESTINATION): void {
    if (!this.isConnected) {
      console.error('WebSocket not connected');
      return;
    }

    this.client.publish({
      destination,
      body: message,
    });
  }

  public isWebSocketConnected(): boolean {
    return this.isConnected;
  }
}
