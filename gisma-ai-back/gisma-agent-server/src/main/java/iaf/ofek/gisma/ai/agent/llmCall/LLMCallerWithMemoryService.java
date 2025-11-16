package iaf.ofek.gisma.ai.agent.llmCall;

import iaf.ofek.gisma.ai.agent.memory.ChatMemoryAdvisorProvider;
import iaf.ofek.gisma.ai.exception.SchemaValidationException;
import iaf.ofek.gisma.ai.util.JsonUtils;
import iaf.ofek.gisma.ai.util.ReactiveUtils;
import iaf.ofek.gisma.ai.util.RetryUtils;
import lombok.extern.log4j.Log4j2;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.client.advisor.SimpleLoggerAdvisor;
import org.springframework.ai.chat.client.advisor.api.Advisor;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.function.Function;

@Service
@Primary
@Log4j2
public class LLMCallerWithMemoryService extends LLMCallerService {

    private final ChatMemoryAdvisorProvider memoryAdvisorProvider;

    @Autowired
    public LLMCallerWithMemoryService(ChatClient.Builder builder, ChatMemoryAdvisorProvider memoryAdvisorProvider) {
        super(
                builder, MessageChatMemoryAdvisor.builder(memoryAdvisorProvider.getChatMemory())
                        .order(90)
                        .build()
        );
        this.memoryAdvisorProvider = memoryAdvisorProvider;
    }

    public LLMCallerWithMemoryService(ChatClient.Builder builder, ChatMemoryAdvisorProvider memoryAdvisorProvider, Advisor... extraAdvisors) {
        super(
                builder,
                combineAdvisors(extraAdvisors, MessageChatMemoryAdvisor.builder(memoryAdvisorProvider.getChatMemory())
                        .order(90)
                        .build())
        );
        this.memoryAdvisorProvider = memoryAdvisorProvider;
    }

    public LLMCallerWithMemoryService(ChatClient.Builder builder, ToolCallbackProvider toolCallbackProvider, ChatMemoryAdvisorProvider memoryAdvisorProvider) {
        super(
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
        return callLLMWithSchemaValidation(callback, responseType, chatId, memoryAdvisorProvider::shortTermMemoryAdvisorConsumer);
    }

    // response to user call
    public Flux<String> callLLM(Function<ChatClient, ChatClient.ChatClientRequestSpec> callback, String chatId) {
        return callLLM(callback, chatId, memoryAdvisorProvider::shortTermMemoryAdvisorConsumer);
    }

}
