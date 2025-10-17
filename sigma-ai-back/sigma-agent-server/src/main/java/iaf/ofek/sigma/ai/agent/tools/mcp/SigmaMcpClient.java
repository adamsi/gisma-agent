package iaf.ofek.sigma.ai.agent.tools.mcp;

import iaf.ofek.sigma.ai.dto.agent.PreflightClassifierResponse;
import iaf.ofek.sigma.ai.agent.llmCaller.LLMCallerService;
import iaf.ofek.sigma.ai.agent.memory.ChatMemoryAdvisorProvider;
import iaf.ofek.sigma.ai.agent.orchestrator.executor.DirectToolExecutor;
import iaf.ofek.sigma.ai.agent.prompt.PromptMessageFormater;
import lombok.extern.log4j.Log4j2;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

@Service
@Log4j2
public class SigmaMcpClient implements DirectToolExecutor {

    private static final String SYSTEM_INSTRUCTIONS = """
            You are the Sigma services API assistant.
            
            Your job is to help users fetch data from the Sigma services system by calling the appropriate tools (functions/endpoints) only.
            You must follow these rules:
            
            1. Always use the registered MCP tools to retrieve information. Do NOT invent or guess values.
            2. Do not attempt to answer questions directly — always call the correct tool.
            3. Keep responses concise and structured. Return only the tool output or a clarification request.
            4. Respect CHAT MEMORY — maintain context from previous user queries when deciding which tool to call or what filters to apply.
            5. Respect QUICKSHOT RESPONSE — the output of the QuickShot similarity search, which may already contain a sufficient answer.
            6. If the user’s request cannot be fulfilled with the available tools, ask for clarification or inform the user politely.
            
            Never provide external knowledge or fabricate data. Always base your responses solely on tool outputs and previous conversation context.
            """;

    private static final String USER_MESSAGE = """
            ### USER QUERY:
            {query}
            
            ### QUICKSHOT RESPONSE:
            {quickshot_response}
            """;


    private final LLMCallerService llmCallerService;


    public SigmaMcpClient(ChatClient.Builder builder, ChatMemoryAdvisorProvider memoryAdvisorProvider, ToolCallbackProvider tools) {
        this.llmCallerService = new LLMCallerService(builder, memoryAdvisorProvider, tools);
    }

    @Override
    public Flux<String> execute(String query, PreflightClassifierResponse classifierResponse) {
        String userMessage = PromptMessageFormater.formatMultiple(
                USER_MESSAGE,
                new String[]{query, classifierResponse.rephrasedResponse()},
                PromptMessageFormater.QUERY, PromptMessageFormater.QUICKSHOT_RESPONSE
                );

        return llmCallerService.callLLM(chatClient -> chatClient.prompt()
                .system(SYSTEM_INSTRUCTIONS)
                .user(userMessage));
    }

}
