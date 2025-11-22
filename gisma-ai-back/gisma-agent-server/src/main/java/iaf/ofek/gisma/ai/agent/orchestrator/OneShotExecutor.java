package iaf.ofek.gisma.ai.agent.orchestrator;

import iaf.ofek.gisma.ai.agent.llmCall.LLMCallerWithMemoryService;
import iaf.ofek.gisma.ai.agent.memory.ChatMemoryAdvisorProvider;
import iaf.ofek.gisma.ai.agent.prompt.PromptFormat;
import iaf.ofek.gisma.ai.dto.agent.UserPrompt;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.vectorstore.QuestionAnswerAdvisor;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import static iaf.ofek.gisma.ai.constant.AdvisorOrder.QA_ADVISOR_ORDER;

@Service
public class OneShotExecutor {

    private static final String SYSTEM_MESSAGE = """
            You are the Gisma API Assistant.
            
            Task:
            Answer user queries using documentation (RAG), chat memory, and live data via MCP tools.
            
            Rules:
            1. Use RAG for API or documentation questions.
            2. Use MCP tools for real-time or user-specific data.
            3. Combine both if needed — never invent information.
            4. Respect chat memory and prior context.
            5. Be concise, factual, and structured.
            6. The response must perfectly match the RESPONSE FORMAT.
            """;

    private static final String USER_PROMPT_TEMPLATE = """
            ### USER QUERY:
            {query}
            
            ### RESPONSE FORMAT
            {response_format}
            """;


    private final LLMCallerWithMemoryService llmCallerService;

    private final QuestionAnswerAdvisor qaAdvisor;

    public OneShotExecutor(@Qualifier("documentVectorStore") VectorStore documentVectorStore,
                           ChatClient.Builder builder, ToolCallbackProvider tools,
                           ChatMemoryAdvisorProvider memoryAdvisorProvider) {
        this.llmCallerService = new LLMCallerWithMemoryService(builder, tools, memoryAdvisorProvider);
        this.qaAdvisor = QuestionAnswerAdvisor.builder(documentVectorStore)
                .order(QA_ADVISOR_ORDER)
                .build();
    }

    public Flux<String> execute(UserPrompt userPrompt, String chatId) {
        String userMessage = USER_PROMPT_TEMPLATE
                .replace(PromptFormat.QUERY, userPrompt.query())
                .replace(PromptFormat.RESPONSE_FORMAT, userPrompt.responseFormat().getFormat(userPrompt.schemaJson()));

        return llmCallerService.callLLM(chatClient -> chatClient.prompt()
                .system(SYSTEM_MESSAGE)
                .user(userMessage)
                .advisors(qaAdvisor), chatId);
    }

    public Mono<String> executeMono(UserPrompt userPrompt, String chatId) {
        String userMessage = USER_PROMPT_TEMPLATE
                .replace(PromptFormat.QUERY, userPrompt.query())
                .replace(PromptFormat.RESPONSE_FORMAT, userPrompt.responseFormat().getFormat(userPrompt.schemaJson()));

        return llmCallerService.callLLMMono(chatClient -> chatClient.prompt()
                .system(SYSTEM_MESSAGE)
                .user(userMessage)
                .advisors(qaAdvisor), chatId);
    }

}
