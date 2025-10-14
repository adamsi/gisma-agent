package iaf.ofek.sigma.ai.service.agent.memory;

import iaf.ofek.sigma.ai.service.auth.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.vectorstore.VectorStoreChatMemoryAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.prompt.PromptTemplate;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.util.function.Consumer;

@Service
@RequiredArgsConstructor
public class ChatMemoryAdvisorProvider {

    private final AuthService authService;

    private final VectorStore memoryVectorStore;


    private static final String CHAT_MEMORY_TEMPLATE = """
            ### CHAT MEMORY:
            {long_term_memory}
            """;

    public VectorStoreChatMemoryAdvisor longTermChatMemoryAdvisor(int advisorOrder) {
        return VectorStoreChatMemoryAdvisor.builder(memoryVectorStore)
                .order(advisorOrder)
                .systemPromptTemplate(new PromptTemplate(CHAT_MEMORY_TEMPLATE))
                .build();
    }

    public Consumer<ChatClient.AdvisorSpec> shortTermMemoryAdvisor() {
        String userId = authService.getCurrentUserId();

        return a -> a.param(ChatMemory.CONVERSATION_ID, userId);
    }

}
