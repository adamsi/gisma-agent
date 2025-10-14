# WebSocket Chat Implementation

This directory contains the WebSocket implementation for real-time chat communication with the backend.

## Files

- `WebSocketManager.ts` - Core WebSocket manager using STOMP.js and SockJS
- `chatService.ts` - High-level chat service that wraps the WebSocket manager
- `config.ts` - Configuration constants for WebSocket settings

## Usage

The WebSocket implementation replaces the hardcoded chunks in the chat API with real-time communication:

1. **Client sends messages** to `/app/chat` endpoint
2. **Client listens for responses** on `/user/queue/reply` endpoint
3. **Backend processes** the message and streams responses back

## Configuration

Update the server URL in `config.ts` or set the environment variable:

```bash
NEXT_PUBLIC_WEBSOCKET_URL=http://your-backend-server:8080
```

## Backend Requirements

Your Spring Boot backend should have:

1. **STOMP WebSocket configuration** with SockJS support
2. **Message mapping** for `/app/chat` endpoint
3. **User-specific response queue** `/user/queue/reply`
4. **Authentication support** - WebSocket connections include cookies for authentication

Example backend controller:
```java
@MessageMapping("/chat")
public Mono<Void> handlePrompt(@Payload String prompt, Principal user) {
    return agentOrchestrator.handleQuery(prompt)
            .doOnNext(response ->
                    messagingTemplate.convertAndSendToUser(
                            user.getName(), "/queue/reply", response
                    )
            )
            .then();
}
```

## Authentication

The WebSocket implementation supports two authentication methods:

1. **Cookie-based Authentication** (Default): Uses HTTP-only cookies with `withCredentials: true`
2. **JWT Token Authentication**: Pass token to ChatService constructor for Bearer token auth

```typescript
// Cookie-based (default)
const chatService = new ChatService('http://localhost:8080');

// JWT Token-based
const chatService = new ChatService('http://localhost:8080', 'your-jwt-token');
```

## Features

- ✅ Automatic reconnection with configurable attempts
- ✅ Heartbeat monitoring
- ✅ Error handling and user feedback
- ✅ TypeScript support with proper types
- ✅ Clean separation of concerns
- ✅ Configurable endpoints and timeouts
