import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { WebSocketConfig, WebSocketResponse } from '../../types/websocket';
import { WEBSOCKET_CONFIG } from './config';

/**
 * Singleton WebSocket Manager with persistent connection and automatic reconnection
 * 
 * Features:
 * - Single persistent connection across the app
 * - Automatic reconnection with exponential backoff
 * - Connection health monitoring
 * - Visibility API integration (reconnect when tab becomes visible)
 * - Simple subscription management with auto-cleanup
 */
export class WebSocketManager {
  private static instance: WebSocketManager | null = null;
  private client: Client | null = null;
  private config: WebSocketConfig;
  private isConnected: boolean = false;
  private isConnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = Infinity; // Never give up
  private baseReconnectDelay: number;
  private subscriptions: Map<string, any> = new Map();
  private responseCallbacks: Map<string, (response: WebSocketResponse) => void> = new Map();
  private metadataCallbacks: Map<string, (response: any) => void> = new Map();
  private connectionPromise: Promise<void> | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private visibilityHandler: (() => void) | null = null;
  private shouldBeConnected: boolean = false;

  private constructor(config: WebSocketConfig) {
    this.config = config;
    this.baseReconnectDelay = config.reconnectDelay || 3000;
    this.setupVisibilityHandler();
  }

  public static getInstance(config?: WebSocketConfig): WebSocketManager {
    if (!WebSocketManager.instance) {
      if (!config) {
        throw new Error('WebSocketManager: Config required for first initialization');
      }
      WebSocketManager.instance = new WebSocketManager(config);
    }
    return WebSocketManager.instance;
  }

  private setupVisibilityHandler(): void {
    if (typeof window === 'undefined') return;
    
    this.visibilityHandler = () => {
      if (document.visibilityState === 'visible' && this.shouldBeConnected && !this.isConnected && !this.isConnecting) {
        console.log('WebSocket: Tab became visible, reconnecting...');
        this.connect();
      }
    };
    
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  private createClient(): Client {
    const client = new Client({
      webSocketFactory: () => {
        const sockjsUrl = `${this.config.serverUrl}${WEBSOCKET_CONFIG.WS_ENDPOINT}`;
        const options: any = {
          withCredentials: true
        };
        
        if (this.config.token) {
          options.headers = {
            'Authorization': `Bearer ${this.config.token}`
          };
        }
        
        return new SockJS(sockjsUrl, null, options);
      },
      debug: () => {}, // Disable debug logs
      reconnectDelay: 0, // We handle reconnection manually
      heartbeatIncoming: WEBSOCKET_CONFIG.HEARTBEAT_INCOMING,
      heartbeatOutgoing: WEBSOCKET_CONFIG.HEARTBEAT_OUTGOING,
    });

    client.onConnect = () => {
      this.isConnected = true;
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      console.log('WebSocket: Connected successfully');
    };

    client.onStompError = (frame) => {
      console.error('WebSocket STOMP Error:', frame.headers['message'], frame.body);
      this.handleDisconnection();
    };

    client.onWebSocketError = (error) => {
      // Only handle as disconnection if we were already connected
      // During initial connection, SockJS transport negotiation errors are expected
      if (this.isConnected) {
        console.error('WebSocket Error:', error);
        this.handleDisconnection();
      }
      // During connection attempt, ignore - SockJS will try other transports
    };

    client.onDisconnect = () => {
      this.handleDisconnection();
    };

    return client;
  }

  private handleDisconnection(): void {
    if (!this.isConnected) return;
    
    this.isConnected = false;
    this.isConnecting = false;
    this.subscriptions.clear();
    
    if (this.shouldBeConnected) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('WebSocket: Max reconnection attempts reached');
      return;
    }

    // Exponential backoff: 3s, 6s, 12s, 24s, max 30s
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts),
      30000
    );

    this.reconnectAttempts++;
    console.log(`WebSocket: Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`);

    this.reconnectTimer = setTimeout(() => {
      if (this.shouldBeConnected && !this.isConnected && !this.isConnecting) {
        this.connect();
      }
    }, delay);
  }

  public async connect(): Promise<void> {
    // Return existing connection promise if already connecting
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    // Return immediately if already connected
    if (this.isConnected && this.client?.active) {
      return Promise.resolve();
    }

    this.shouldBeConnected = true;
    this.connectionPromise = this.attemptConnectionWithRetry();
    
    return this.connectionPromise;
  }

  private async attemptConnectionWithRetry(): Promise<void> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await this.attemptConnection();
        return; // Success!
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        // Only retry on timeout or connection errors, not on STOMP protocol errors
        if (lastError.message.includes('STOMP Error')) {
          throw lastError; // Don't retry STOMP errors
        }
        
        if (attempt < maxRetries - 1) {
          // Wait a bit before retrying (exponential backoff)
          const delay = Math.min(1000 * Math.pow(2, attempt), 3000);
          console.log(`WebSocket: Connection attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          // Reset connection state for retry
          this.isConnecting = false;
          this.connectionPromise = null;
        }
      }
    }

    // If all retries failed, throw the last error
    throw lastError || new Error('Connection failed after retries');
  }

  private attemptConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnecting) {
        resolve();
        return;
      }

      this.isConnecting = true;

      const timeout = setTimeout(() => {
        this.isConnecting = false;
        this.connectionPromise = null;
        reject(new Error(`Connection timeout after ${WEBSOCKET_CONFIG.CONNECTION_TIMEOUT / 1000}s`));
      }, WEBSOCKET_CONFIG.CONNECTION_TIMEOUT);

      // Create new client if needed
      if (!this.client) {
        this.client = this.createClient();
      }

      // Override handlers for this connection attempt
      const originalOnConnect = this.client.onConnect;
      const originalOnError = this.client.onStompError;
      const originalOnWsError = this.client.onWebSocketError;

      this.client.onConnect = (frame) => {
        originalOnConnect?.(frame);
        clearTimeout(timeout);
        this.connectionPromise = null;
        resolve();
      };

      this.client.onStompError = (frame) => {
        originalOnError?.(frame);
        clearTimeout(timeout);
        this.isConnecting = false;
        this.connectionPromise = null;
        reject(new Error(`STOMP Error: ${frame.headers['message'] || 'Unknown error'}`));
      };

      // During SockJS transport negotiation, WebSocket errors are expected
      // as it tries different transports. Don't reject - let SockJS continue
      // and only fail on actual STOMP errors or timeout.
      this.client.onWebSocketError = (error) => {
        // Don't call originalOnWsError during connection attempt as it would
        // trigger handleDisconnection unnecessarily
        // Only log for debugging - SockJS will continue trying other transports
        if (!this.isConnected) {
          // Silently ignore during connection - this is normal SockJS behavior
          return;
        }
        // If already connected, treat as real error
        originalOnWsError?.(error);
      };

      try {
        if (!this.client.active) {
          this.client.activate();
        } else {
          clearTimeout(timeout);
          this.connectionPromise = null;
          resolve();
        }
      } catch (error) {
        clearTimeout(timeout);
        this.isConnecting = false;
        this.connectionPromise = null;
        reject(new Error(`Failed to activate: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  }

  public disconnect(): void {
    this.shouldBeConnected = false;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.subscriptions.forEach((subscription) => {
      try {
        subscription.unsubscribe();
      } catch (error) {
        // Ignore unsubscribe errors
      }
    });
    this.subscriptions.clear();
    this.responseCallbacks.clear();
    this.metadataCallbacks.clear();

    if (this.client?.active) {
      try {
        this.client.deactivate();
      } catch (error) {
        // Ignore deactivation errors
      }
    }

    this.isConnected = false;
    this.isConnecting = false;
    this.connectionPromise = null;
  }

  public async ensureConnected(): Promise<void> {
    if (!this.isConnected || !this.client?.active) {
      await this.connect();
    }
  }

  public subscribeToReply(
    destination: string,
    onResponse: (response: WebSocketResponse) => void,
    callbackKey: string = 'default'
  ): void {
    if (!this.client || !this.isConnected) {
      console.warn('WebSocket: Not connected, subscription will be set up after connection');
      // Store callback to set up after connection
      this.responseCallbacks.set(callbackKey, onResponse);
      this.ensureConnected().then(() => {
        this.setupSubscription(destination, callbackKey);
      });
      return;
    }

    this.responseCallbacks.set(callbackKey, onResponse);
    this.setupSubscription(destination, callbackKey);
  }

  private setupSubscription(destination: string, callbackKey: string): void {
    if (!this.client || !this.isConnected) return;

    // Unsubscribe existing subscription for this destination
    const existing = this.subscriptions.get(destination);
    if (existing) {
      try {
        existing.unsubscribe();
      } catch (error) {
        // Ignore errors
      }
    }

    const subscription = this.client.subscribe(destination, (message) => {
      try {
        const callback = this.responseCallbacks.get(callbackKey);
        if (callback) {
          const isComplete = !message.body || message.body.trim() === '' || message.body === '[DONE]';
          callback({ 
            type: 'response', 
            content: message.body || '', 
            isComplete 
          });
        }
      } catch (error) {
        console.error('WebSocket: Error handling message:', error);
      }
    });

    this.subscriptions.set(destination, subscription);
  }

  public subscribeToMetadata(
    onMetadata: (response: any) => void,
    callbackKey: string = 'default'
  ): void {
    if (!this.client || !this.isConnected) {
      console.warn('WebSocket: Not connected, metadata subscription will be set up after connection');
      this.metadataCallbacks.set(callbackKey, onMetadata);
      this.ensureConnected().then(() => {
        this.setupMetadataSubscription(callbackKey);
      });
      return;
    }

    this.metadataCallbacks.set(callbackKey, onMetadata);
    this.setupMetadataSubscription(callbackKey);
  }

  private setupMetadataSubscription(callbackKey: string): void {
    if (!this.client || !this.isConnected) return;

    const destination = WEBSOCKET_CONFIG.RECEIVE_METADATA_DESTINATION;
    
    // Unsubscribe existing
    const existing = this.subscriptions.get(destination);
    if (existing) {
      try {
        existing.unsubscribe();
      } catch (error) {
        // Ignore errors
      }
    }

    const subscription = this.client.subscribe(destination, (message) => {
      try {
        const metadata = JSON.parse(message.body);
        const callback = this.metadataCallbacks.get(callbackKey);
        if (callback) {
          callback(metadata);
        }
      } catch (error) {
        console.error('WebSocket: Error parsing metadata:', error);
      }
    });

    this.subscriptions.set(destination, subscription);
  }

  public async sendMessage(
    message: string, 
    destination: string = WEBSOCKET_CONFIG.SEND_DESTINATION
  ): Promise<void> {
    await this.ensureConnected();

    if (!this.client || !this.isConnected) {
      throw new Error('WebSocket: Cannot send message, not connected');
    }

    this.client.publish({
      destination,
      body: message,
    });
  }

  public unsubscribe(destination: string): void {
    const subscription = this.subscriptions.get(destination);
    if (subscription) {
      try {
        subscription.unsubscribe();
        this.subscriptions.delete(destination);
      } catch (error) {
        // Ignore errors
      }
    }
  }

  public clearResponseHandler(callbackKey: string = 'default'): void {
    this.responseCallbacks.delete(callbackKey);
  }

  public isWebSocketConnected(): boolean {
    return this.isConnected && this.client?.active === true;
  }

  public destroy(): void {
    this.disconnect();
    
    if (this.visibilityHandler && typeof window !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }
    
    WebSocketManager.instance = null;
  }
}