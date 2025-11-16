package iaf.ofek.gisma.ai.agent.llmCall;

import iaf.ofek.gisma.ai.agent.memory.ChatMemoryAdvisorProvider;
import lombok.extern.log4j.Log4j2;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.client.advisor.api.Advisor;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.util.Arrays;
import java.util.function.Function;

@Service
@Log4j2
public class LLMCallerWithMemoryService {

    private final LLMCallerService llmCallerService;

    private final ChatMemoryAdvisorProvider memoryAdvisorProvider;

    @Autowired
    public LLMCallerWithMemoryService(ChatClient.Builder builder, ChatMemoryAdvisorProvider memoryAdvisorProvider) {
        this.llmCallerService = new LLMCallerService(
                builder, MessageChatMemoryAdvisor.builder(memoryAdvisorProvider.getChatMemory())
                        .order(90)
                        .build()
        );
        this.memoryAdvisorProvider = memoryAdvisorProvider;
    }

    public LLMCallerWithMemoryService(ChatClient.Builder builder, ChatMemoryAdvisorProvider memoryAdvisorProvider, Advisor... extraAdvisors) {
        this.llmCallerService = new LLMCallerService(
                builder,
                combineAdvisors(extraAdvisors, MessageChatMemoryAdvisor.builder(memoryAdvisorProvider.getChatMemory())
                        .order(90)
                        .build())
        );
        this.memoryAdvisorProvider = memoryAdvisorProvider;
    }

    public LLMCallerWithMemoryService(ChatClient.Builder builder, ToolCallbackProvider toolCallbackProvider, ChatMemoryAdvisorProvider memoryAdvisorProvider) {
        this.llmCallerService = new LLMCallerService(
                builder,
             toolCallbackProvider,
             MessageChatMemoryAdvisor.builder(memoryAdvisorProvider.getChatMemory())
                        .order(90)
                        .build()
        );
        this.memoryAdvisorProvider = memoryAdvisorProvider;
    }

    // intermediate agent phases
    public <T> T callLLMWithSchemaValidation(Function<ChatClient, ChatClient.ChatClientRequestSpec> callback, Class<T> responseType, String chatId) {
        return llmCallerService.callLLMWithSchemaValidation(callback, responseType, chatId, memoryAdvisorProvider::shortTermMemoryAdvisorConsumer);
    }

    // response to user call
    public Flux<String> callLLM(Function<ChatClient, ChatClient.ChatClientRequestSpec> callback, String chatId) {
        return llmCallerService.callLLM(callback, chatId, memoryAdvisorProvider::shortTermMemoryAdvisorConsumer);
    }

    protected static Advisor[] combineAdvisors(Advisor[] extra, Advisor additional) {
        Advisor[] combined = Arrays.copyOf(extra, extra.length + 1);
        combined[extra.length] = additional;
        return combined;
    }

}
