import { WebSocketManager } from './WebSocketManager';
import { WebSocketResponse, ChatStartResponse } from '../../types/websocket';
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
    });
  }

  public setAuthenticated(authenticated: boolean): void {
    this.isAuthenticated = authenticated;
    this.wsManager = new WebSocketManager({
      serverUrl: this.serverUrl,
      reconnectAttempts: WEBSOCKET_CONFIG.RECONNECT_ATTEMPTS,
      reconnectDelay: WEBSOCKET_CONFIG.RECONNECT_DELAY,
    });
  }

  public async connect(): Promise<void> {
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

  public async startNewChat(
    message: string,
    responseFormat: string,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: string) => void,
    onMetadata: (metadata: ChatStartResponse) => void,
    schemaJson?: string
  ): Promise<void> {
    if (!this.isAuthenticated) {
      onError('User not authenticated');
      return;
    }

    this.stopped = false;
    if (!this.wsManager.isWebSocketConnected()) {
      await this.connect();
    }

    // Subscribe to metadata first - when chatId arrives, subscribe to chat-specific queue
    this.wsManager.subscribeToMetadata((metadata: ChatStartResponse) => {
      // Notify caller about metadata
      onMetadata(metadata);
      
      // Subscribe to the chat-specific reply queue
      const replyDestination = `/user/queue/chat.${metadata.chatId}`;
      this.wsManager.subscribeToReply(replyDestination, (response: WebSocketResponse) => {
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
      }, metadata.chatId);
    }, 'start-chat');

    // Send start chat message
    const payload = {
      query: message,
      responseFormat: responseFormat,
      schemaJson: schemaJson || null
    };

    this.wsManager.sendMessage(JSON.stringify(payload), WEBSOCKET_CONFIG.SEND_START_DESTINATION);
  }

  public async sendMessage(
    message: string,
    chatId: string,
    responseFormat: string,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: string) => void,
    schemaJson?: string
  ): Promise<void> {
    if (!this.isAuthenticated) {
      onError('User not authenticated');
      return;
    }

    this.stopped = false;
    if (!this.wsManager.isWebSocketConnected()) {
      await this.connect();
    }

    const replyDestination = `/user/queue/chat.${chatId}`;
    this.wsManager.subscribeToReply(replyDestination, (response: WebSocketResponse) => {
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
    }, chatId);

    const payload = {
      query: message,
      responseFormat: responseFormat,
      schemaJson: schemaJson || null,
      chatId: chatId
    };

    this.wsManager.sendMessage(JSON.stringify(payload), WEBSOCKET_CONFIG.SEND_DESTINATION);
  }

  public abortCurrentStream(): void {
    this.stopped = true;
    this.wsManager.abort();
  }

  public isConnected(): boolean {
    return this.wsManager.isWebSocketConnected();
  }
}
