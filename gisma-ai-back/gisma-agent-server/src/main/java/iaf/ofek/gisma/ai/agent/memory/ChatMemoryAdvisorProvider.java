package iaf.ofek.gisma.ai.agent.memory;

import lombok.Getter;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.memory.MessageWindowChatMemory;
import org.springframework.ai.chat.memory.repository.jdbc.JdbcChatMemoryRepository;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.util.UUID;
import java.util.function.Consumer;

@Service
public class ChatMemoryAdvisorProvider {

    @Getter
    private final ChatMemory chatMemory;

    public ChatMemoryAdvisorProvider(JdbcChatMemoryRepository jdbcChatMemoryRepository) {
        this.chatMemory = MessageWindowChatMemory.builder()
                .chatMemoryRepository(jdbcChatMemoryRepository)
                .maxMessages(10)
                .build();
    }

    public Consumer<ChatClient.AdvisorSpec> shortTermMemoryAdvisorConsumer(UUID userId) {
        return a -> a.param(ChatMemory.CONVERSATION_ID, userId);
    }

}
