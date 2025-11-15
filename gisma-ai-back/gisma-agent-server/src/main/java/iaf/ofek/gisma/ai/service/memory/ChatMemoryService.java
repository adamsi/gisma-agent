package iaf.ofek.gisma.ai.service.memory;

import iaf.ofek.gisma.ai.agent.memory.ChatDescriptionGenerator;
import iaf.ofek.gisma.ai.dto.agent.memory.ChatMessage;
import iaf.ofek.gisma.ai.dto.agent.memory.ChatMetadata;
import iaf.ofek.gisma.ai.dto.agent.memory.ChatStartRequest;
import iaf.ofek.gisma.ai.dto.agent.memory.ChatStartResponse;
import iaf.ofek.gisma.ai.repository.ChatMemoryRepository;
import iaf.ofek.gisma.ai.util.ReactiveUtils;
import iaf.ofek.gisma.ai.util.RetryUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChatMemoryService {

    private final ChatMemoryRepository chatMemoryRepository;

    private final ChatDescriptionGenerator chatDescriptionGenerator;

    /**
     * Retrieves all chat conversations for display in the sidebar
     **/
    public List<ChatMetadata> getAllChats(String userId) {
        return this.chatMemoryRepository.getAllChatsForUser(UUID.fromString(userId));
    }

    /**
     * Loads the complete message history for a specific chat
     **/
    public List<ChatMessage> getChatMessages(String chatId) {
        return chatMemoryRepository.getChatMessages(UUID.fromString(chatId));
    }

    public Mono<ChatStartResponse> createChat(ChatStartRequest chatStartRequest, String userId) {
        return chatDescriptionGenerator.generateDescription(chatStartRequest.query())
                .flatMap(description ->
                        ReactiveUtils.runBlockingAsync(() ->
                                        chatMemoryRepository.generateChatId(
                                                UUID.fromString(userId),
                                                description
                                        )
                                )
                                .map(chatId ->
                                        new ChatStartResponse(chatId, description)
                                )
                );
    }

}
