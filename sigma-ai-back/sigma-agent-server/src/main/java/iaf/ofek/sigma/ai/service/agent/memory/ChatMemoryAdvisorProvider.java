package iaf.ofek.sigma.ai.service.agent.memory;

import org.springframework.ai.chat.client.advisor.vectorstore.VectorStoreChatMemoryAdvisor;
import org.springframework.ai.chat.prompt.PromptTemplate;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

@Service
public class ChatMemoryAdvisorProvider {

    private final VectorStore memoryVectorStore;

    public ChatMemoryAdvisorProvider(@Qualifier("memoryVectorStore") VectorStore memoryVectorStore) {
        this.memoryVectorStore = memoryVectorStore;
    }

    private static final String CHAT_MEMORY_TEMPLATE = """
            ### CHAT MEMORY:
            {long_term_memory}
            """;

    public VectorStoreChatMemoryAdvisor chatMemoryAdvisor(int advisorOrder) {
        return VectorStoreChatMemoryAdvisor.builder(memoryVectorStore)
                .order(advisorOrder)
                .systemPromptTemplate(new PromptTemplate(CHAT_MEMORY_TEMPLATE))
                .build();
    }

}
