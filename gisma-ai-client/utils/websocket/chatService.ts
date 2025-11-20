import { WebSocketManager } from './WebSocketManager';
import { WebSocketResponse, ChatStartResponse } from '../../types/websocket';
import { WEBSOCKET_CONFIG } from './config';

/**
 * Simplified Chat Service with automatic connection management
 * 
 * Features:
 * - Automatic connection on first use
 * - Simple message sending API
 * - Automatic subscription management
 * - No manual connection/disconnection needed
 */
export class ChatService {
  private wsManager: WebSocketManager;
  private serverUrl: string;
  private isAuthenticated: boolean = false;

  constructor(serverUrl: string = WEBSOCKET_CONFIG.SERVER_URL) {
    this.serverUrl = serverUrl;
    this.wsManager = WebSocketManager.getInstance({
      serverUrl,
      reconnectAttempts: WEBSOCKET_CONFIG.RECONNECT_ATTEMPTS,
      reconnectDelay: WEBSOCKET_CONFIG.RECONNECT_DELAY,
    });
  }

  public setAuthenticated(authenticated: boolean): void {
    this.isAuthenticated = authenticated;
    
    if (!authenticated) {
      // Disconnect when user logs out
      this.wsManager.disconnect();
    }
  }

  private async ensureReady(): Promise<void> {
    if (!this.isAuthenticated) {
      throw new Error('User not authenticated');
    }
    await this.wsManager.ensureConnected();
  }

  /**
   * Start a new chat conversation
   */
  public async startNewChat(
    message: string,
    responseFormat: string,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: string) => void,
    onMetadata: (metadata: ChatStartResponse) => void,
    schemaJson?: string
  ): Promise<void> {
    await this.ensureReady();

    // Subscribe to metadata first
    this.wsManager.subscribeToMetadata((metadata: ChatStartResponse) => {
      onMetadata(metadata);
      
      // Once we have chatId, subscribe to chat-specific queue
      const replyDestination = `/user/queue/chat.${metadata.chatId}`;
      this.wsManager.subscribeToReply(replyDestination, (response: WebSocketResponse) => {
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

    await this.wsManager.sendMessage(
      JSON.stringify(payload), 
      WEBSOCKET_CONFIG.SEND_START_DESTINATION
    );
  }

  /**
   * Send a message to an existing chat
   */
  public async sendMessage(
    message: string,
    chatId: string,
    responseFormat: string,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: string) => void,
    schemaJson?: string
  ): Promise<void> {
    await this.ensureReady();

    const replyDestination = `/user/queue/chat.${chatId}`;
    
    // Subscribe to chat-specific reply queue
    this.wsManager.subscribeToReply(replyDestination, (response: WebSocketResponse) => {
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

    // Send message
    const payload = {
      query: message,
      responseFormat: responseFormat,
      schemaJson: schemaJson || null,
      chatId: chatId
    };

    await this.wsManager.sendMessage(
      JSON.stringify(payload), 
      WEBSOCKET_CONFIG.SEND_DESTINATION
    );
  }

  /**
   * Abort current stream (unsubscribe from current chat)
   */
  public abortCurrentStream(chatId?: string): void {
    if (chatId) {
      const replyDestination = `/user/queue/chat.${chatId}`;
      this.wsManager.unsubscribe(replyDestination);
      this.wsManager.clearResponseHandler(chatId);
    }
    
    // Also clear metadata subscription
    this.wsManager.unsubscribe(WEBSOCKET_CONFIG.RECEIVE_METADATA_DESTINATION);
    this.wsManager.clearResponseHandler('start-chat');
  }

  /**
   * Disconnect websocket (usually on logout)
   */
  public disconnect(): void {
    this.wsManager.disconnect();
  }

  /**
   * Check if websocket is connected
   */
  public isConnected(): boolean {
    return this.wsManager.isWebSocketConnected();
  }
}