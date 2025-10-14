import { WebSocketManager } from './WebSocketManager';
import { WebSocketResponse } from '../../types/websocket';
import { WEBSOCKET_CONFIG } from './config';

export class ChatService {
  private wsManager: WebSocketManager;
  private serverUrl: string;
  private token: string | null = null;
  private stopped: boolean = false;

  constructor(serverUrl: string = WEBSOCKET_CONFIG.SERVER_URL, token?: string) {
    this.serverUrl = serverUrl;
    this.token = token || null;
    this.wsManager = new WebSocketManager({
      serverUrl,
      reconnectAttempts: WEBSOCKET_CONFIG.RECONNECT_ATTEMPTS,
      reconnectDelay: WEBSOCKET_CONFIG.RECONNECT_DELAY,
      token: this.token || undefined,
    });
  }

  public setToken(token: string): void {
    this.token = token;
    // Recreate the WebSocket manager with the new token
    this.wsManager = new WebSocketManager({
      serverUrl: this.serverUrl,
      reconnectAttempts: WEBSOCKET_CONFIG.RECONNECT_ATTEMPTS,
      reconnectDelay: WEBSOCKET_CONFIG.RECONNECT_DELAY,
      token: this.token || undefined,
    });
  }

  public async connect(): Promise<void> {
    await this.wsManager.connect();
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
