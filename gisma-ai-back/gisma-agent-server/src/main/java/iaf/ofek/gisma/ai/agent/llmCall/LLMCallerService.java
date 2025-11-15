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
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.function.Function;

@Service
@Log4j2
public class LLMCallerService {

    private static final int MAX_LLM_RETRY_CALLS = 3;

    private static final int LLM_RETRY_DELAY_SECONDS = 2;

    private final ChatClient chatClient;

    private final ChatMemoryAdvisorProvider memoryAdvisorProvider;

    @Autowired
    public LLMCallerService(ChatClient.Builder builder, ChatMemoryAdvisorProvider memoryAdvisorProvider) {
        SimpleLoggerAdvisor loggerAdvisor = SimpleLoggerAdvisor.builder().order(100).build();
        this.chatClient = builder
                .defaultAdvisors(loggerAdvisor,
                        MessageChatMemoryAdvisor.builder(memoryAdvisorProvider.getChatMemory())
                                .order(90)
                                .build())
                .build();
        this.memoryAdvisorProvider = memoryAdvisorProvider;
    }

    public LLMCallerService(ChatClient.Builder builder, ChatMemoryAdvisorProvider memoryAdvisorProvider, Advisor... extraAdvisors) {
        SimpleLoggerAdvisor loggerAdvisor = SimpleLoggerAdvisor.builder().order(100).build();
        List<Advisor> advisors = new ArrayList<>(Arrays.stream(extraAdvisors).toList());
        advisors.add(loggerAdvisor);
        advisors.add(MessageChatMemoryAdvisor.builder(memoryAdvisorProvider.getChatMemory())
                .order(90)
                .build());
        this.chatClient = builder
                .defaultAdvisors(advisors)
                .build();
        this.memoryAdvisorProvider = memoryAdvisorProvider;
    }

    public LLMCallerService(ChatClient.Builder builder, ToolCallbackProvider toolCallbackProvider, ChatMemoryAdvisorProvider memoryAdvisorProvider) {
        SimpleLoggerAdvisor loggerAdvisor = SimpleLoggerAdvisor.builder().order(100).build();
        this.chatClient = builder
                .defaultAdvisors(loggerAdvisor,
                        MessageChatMemoryAdvisor.builder(memoryAdvisorProvider.getChatMemory())
                                .order(90)
                                .build())
                .defaultToolCallbacks(toolCallbackProvider)
                .build();
        this.memoryAdvisorProvider = memoryAdvisorProvider;
    }

    // intermediate agent phases
    public <T> T callLLMWithSchemaValidation(Function<ChatClient, ChatClient.ChatClientRequestSpec> callback, Class<T> responseType, String chatId) {
        return RetryUtils.callWithRetriesBlocking(
                () -> {
                    String rawResponse = callback.apply(chatClient)
                            .advisors(memoryAdvisorProvider.shortTermMemoryAdvisorConsumer(chatId))
                            .call()
                            .content();

                    return JsonUtils.parseJson(rawResponse, responseType);
                },
                MAX_LLM_RETRY_CALLS,
                Duration.ofSeconds(LLM_RETRY_DELAY_SECONDS),
                ex -> !(ex instanceof SchemaValidationException),
                "callLLMWithSchemaValidation"
        );
    }

    // response to user call
    public Flux<String> callLLM(Function<ChatClient, ChatClient.ChatClientRequestSpec> callback, String chatId) {
        return RetryUtils.callWithRetries(
                () -> callback.apply(chatClient)
                        .advisors(memoryAdvisorProvider.shortTermMemoryAdvisorConsumer(chatId))
                        .stream()
                        .content(),
                MAX_LLM_RETRY_CALLS,
                Duration.ofSeconds(LLM_RETRY_DELAY_SECONDS),
                ex -> false,
                "callLLM"
        );
    }

    public Mono<String> callLLM(Function<ChatClient, ChatClient.ChatClientRequestSpec> callback) {
        return RetryUtils.callWithRetriesMono(
                () -> ReactiveUtils.runBlockingAsync(() ->
                        callback.apply(chatClient)
                                .call()
                                .content()),
                MAX_LLM_RETRY_CALLS,
                Duration.ofSeconds(LLM_RETRY_DELAY_SECONDS),
                ex -> false,
                "callLLM"
        );
    }

}
