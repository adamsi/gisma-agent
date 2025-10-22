import { WebSocketManager } from './WebSocketManager';
import { WebSocketResponse } from '../../types/websocket';
import { WEBSOCKET_CONFIG } from './config';

export class ChatService {
  private wsManager: WebSocketManager;
  private serverUrl: string;
  private isAuthenticated: boolean = false;
  private stopped: boolean = false;

  constructor(serverUrl: string = WEBSOCKET_CONFIG.SERVER_URL) {
    this.serverUrl = serverUrl;
    this.wsManager = new WebSocketManager({
      serverUrl,
      reconnectAttempts: WEBSOCKET_CONFIG.RECONNECT_ATTEMPTS,
      reconnectDelay: WEBSOCKET_CONFIG.RECONNECT_DELAY,
      // No token needed for cookie-based authentication
    });
  }

  public setAuthenticated(authenticated: boolean): void {
    this.isAuthenticated = authenticated;
    // Recreate the WebSocket manager when authentication state changes
    this.wsManager = new WebSocketManager({
      serverUrl: this.serverUrl,
      reconnectAttempts: WEBSOCKET_CONFIG.RECONNECT_ATTEMPTS,
      reconnectDelay: WEBSOCKET_CONFIG.RECONNECT_DELAY,
      // No token needed for cookie-based authentication
    });
  }

  public async connect(): Promise<void> {
    // Don't connect if user not authenticated
    if (!this.isAuthenticated) {
      console.warn('ChatService: User not authenticated, skipping WebSocket connection');
      return;
    }

    try {
      await this.wsManager.connect();
    } catch (error) {
      console.error('ChatService: Failed to connect to WebSocket:', error);
      throw error;
    }
  }

  public disconnect(): void {
    this.wsManager.disconnect();
  }

  public async sendMessage(
    message: string,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ): Promise<void> {
    // Don't send messages if user not authenticated
    if (!this.isAuthenticated) {
      console.warn('ChatService: User not authenticated, cannot send message');
      onError('User not authenticated');
      return;
    }

    this.stopped = false;
    if (!this.wsManager.isWebSocketConnected()) {
      await this.connect();
    }

    this.wsManager.sendMessage(message, (response: WebSocketResponse) => {
      if (this.stopped) return;

      if (response.error) {
        onError(response.error);
        return;
      }

      if (response.content) {
        onChunk(response.content);
      }

      if (response.isComplete) {
        onComplete();
      }
    });
  }

  public abortCurrentStream(): void {
    this.stopped = true;
    this.wsManager.clearResponseHandler();
  }

  public isConnected(): boolean {
    return this.wsManager.isWebSocketConnected();
  }
}
