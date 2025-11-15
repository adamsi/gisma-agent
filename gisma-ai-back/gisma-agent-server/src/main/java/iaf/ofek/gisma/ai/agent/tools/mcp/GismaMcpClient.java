package iaf.ofek.gisma.ai.agent.tools.mcp;

import iaf.ofek.gisma.ai.agent.llmCall.LLMCallerService;
import iaf.ofek.gisma.ai.agent.memory.ChatMemoryAdvisorProvider;
import iaf.ofek.gisma.ai.agent.orchestrator.executor.DirectToolExecutor;
import iaf.ofek.gisma.ai.agent.orchestrator.executor.StepExecutor;
import iaf.ofek.gisma.ai.agent.prompt.PromptFormat;
import iaf.ofek.gisma.ai.dto.agent.PlannerStep;
import iaf.ofek.gisma.ai.dto.agent.PreflightClassifierResult;
import iaf.ofek.gisma.ai.dto.agent.StepExecutionResult;
import iaf.ofek.gisma.ai.dto.agent.UserPrompt;
import iaf.ofek.gisma.ai.util.ReactiveUtils;
import lombok.extern.log4j.Log4j2;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
@Log4j2
public class GismaMcpClient implements DirectToolExecutor, StepExecutor {

    private static final String SYSTEM_INSTRUCTIONS = """
            You are the Gisma services API assistant.
            
            Your job is to help users fetch data from the Gisma services system by calling the appropriate tools (functions/endpoints) only.
            You must follow these rules:
            
            1. Always use the registered MCP tools to retrieve information. Do NOT invent or guess values.
            2. Do not attempt to answer questions directly — always call the correct tool.
            3. Keep responses concise and structured. Return only the tool output or a clarification request.
            4. Respect CHAT MEMORY — maintain context from previous user queries when deciding which tool to call or what filters to apply.
            5. Respect QUICKSHOT RESPONSE — the output of the QuickShot similarity search, which may already contain a sufficient answer.
            6. If the user’s request cannot be fulfilled with the available tools, ask for clarification or inform the user politely.
            7. Always Provide a response that matches the RESPONSE FORMAT
            
            Never provide external knowledge or fabricate data. Always base your responses solely on tool outputs and previous conversation context.
            """;

    private static final String USER_PROMPT_TEMPLATE = """
            ### USER QUERY:
            {query}
            
            ### QUICKSHOT RESPONSE:
            {quickshot_response}
            
            ### RESPONSE FORMAT
            {response_format}
            """;

    private static final String STEP_SYSTEM_INSTRUCTIONS = """
        You are the Gisma MCP step executor.
        
        Execute the described step using the provided MCP endpoints and input parameters.
        Return only the execution result or tool output.
        Do not plan, decide, or invent endpoints.
        Be concise and structured.
        """;

    private static final String STEP_PROMPT_TEMPLATE = """
            ### MCP CLIENT STEP
            Endpoints: {mcp_endpoints}
            
            ### INPUT PARAMETERS:
            {mcp_input}
            
            ### USER QUERY:
            {query}
            
            ### STEP DESCRIPTION:
            {step_description}
            """;


    private final LLMCallerService llmCallerService;


    public GismaMcpClient(ChatClient.Builder builder, ToolCallbackProvider tools, ChatMemoryAdvisorProvider memoryAdvisorProvider) {
        this.llmCallerService = new LLMCallerService(builder, tools, memoryAdvisorProvider);
    }

    @Override
    public Flux<String> execute(UserPrompt prompt, PreflightClassifierResult classifierResponse, String chatId) {
        String userMessage = USER_PROMPT_TEMPLATE
                .replace(PromptFormat.QUERY, prompt.query())
                .replace(PromptFormat.QUICKSHOT_RESPONSE, classifierResponse.rephrasedResponse())
                .replace(PromptFormat.RESPONSE_FORMAT, prompt.responseFormat()
                        .getFormat(prompt.schemaJson()));

        return llmCallerService.callLLM(chatClient -> chatClient.prompt()
                .system(SYSTEM_INSTRUCTIONS)
                .user(userMessage), chatId);
    }

    @Override
    public Mono<StepExecutionResult> executeStep(PlannerStep step, String chatId) {
        String endpoints = (step.mcpEndpoints() != null && !step.mcpEndpoints().isEmpty())
                ? String.join(", ", step.mcpEndpoints())
                : "No specific endpoints provided";

        String input = step.input() != null ? step.input().toString() : "{}";
        String query = step.query() != null ? step.query() : "";
        String description = step.description() != null ? step.description() : "";

        // Build a clear, human-readable prompt for the LLM tool executor
        String userMessage = STEP_PROMPT_TEMPLATE
                .replace(PromptFormat.MCP_ENDPOINTS, endpoints)
                .replace(PromptFormat.MCP_INPUT, input)
                .replace(PromptFormat.QUERY, query)
                .replace(PromptFormat.STEP_DESCRIPTION, description);

        return ReactiveUtils.runBlockingAsync(() ->
                llmCallerService.callLLMWithSchemaValidation(
                        chatClient -> chatClient.prompt()
                                .system(STEP_SYSTEM_INSTRUCTIONS)
                                .user(userMessage),
                        StepExecutionResult.class,
                        chatId
                )
        );
    }
}
