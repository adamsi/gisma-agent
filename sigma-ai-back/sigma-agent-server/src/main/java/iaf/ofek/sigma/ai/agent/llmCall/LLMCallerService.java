package iaf.ofek.sigma.ai.agent.llmCall;

import iaf.ofek.sigma.ai.exception.SchemaValidationException;
import iaf.ofek.sigma.ai.agent.memory.ChatMemoryAdvisorProvider;
import iaf.ofek.sigma.ai.util.JsonUtils;
import iaf.ofek.sigma.ai.util.RetryUtils;
import lombok.extern.log4j.Log4j2;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.SimpleLoggerAdvisor;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.time.Duration;
import java.util.function.Function;

@Service
@Log4j2
public class LLMCallerService {

    private static final int MAX_LLM_RETRY_CALLS = 3;

    private static final int LLM_RETRY_DELAY_SECONDS = 2;

    private final ChatClient chatClient;

    @Autowired
    public LLMCallerService(ChatClient.Builder builder, ChatMemoryAdvisorProvider memoryAdvisorProvider) {
        SimpleLoggerAdvisor loggerAdvisor = SimpleLoggerAdvisor.builder().build();
        this.chatClient = builder
                .defaultAdvisors(loggerAdvisor)
                .defaultAdvisors(memoryAdvisorProvider.shortTermMemoryAdvisor())
                .build();
    }

    public LLMCallerService(ChatClient.Builder builder, ChatMemoryAdvisorProvider memoryAdvisorProvider, ToolCallbackProvider toolCallbackProvider) {
        SimpleLoggerAdvisor loggerAdvisor = SimpleLoggerAdvisor.builder().build();
        this.chatClient = builder
                .defaultAdvisors(loggerAdvisor)
                .defaultAdvisors(memoryAdvisorProvider.shortTermMemoryAdvisor())
                .defaultToolCallbacks(toolCallbackProvider)
                .build();
    }

    // intermediate agent phases
    public <T> T callLLMWithSchemaValidation(Function<ChatClient, ChatClient.ChatClientRequestSpec> callback, Class<T> responseType) {
        return RetryUtils.callWithRetriesBlocking(
                () -> {
                    String rawResponse = callback.apply(chatClient).call().content();

                    return JsonUtils.parseJson(rawResponse, responseType);
                },
                MAX_LLM_RETRY_CALLS,
                Duration.ofSeconds(LLM_RETRY_DELAY_SECONDS),
                ex -> !(ex instanceof SchemaValidationException),
                "callLLMWithSchemaValidation"
        );
    }

    // response to user call
    public Flux<String> callLLM(Function<ChatClient, ChatClient.ChatClientRequestSpec> callback) {
        return RetryUtils.callWithRetries(
                () -> callback.apply(chatClient).stream().content(),
                MAX_LLM_RETRY_CALLS,
                Duration.ofSeconds(LLM_RETRY_DELAY_SECONDS),
                ex -> false,
                "callLLM"
        );
    }

}
