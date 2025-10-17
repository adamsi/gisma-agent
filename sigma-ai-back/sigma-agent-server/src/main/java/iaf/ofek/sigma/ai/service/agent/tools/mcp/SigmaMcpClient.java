package iaf.ofek.sigma.ai.service.agent.tools.mcp;

import iaf.ofek.sigma.ai.enums.ToolManifest;
import iaf.ofek.sigma.ai.service.agent.memory.ChatMemoryAdvisorProvider;
import iaf.ofek.sigma.ai.service.agent.tools.AgentTool;
import iaf.ofek.sigma.ai.service.auth.AuthService;
import lombok.extern.log4j.Log4j2;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.SimpleLoggerAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

@Service
@Log4j2
public class SigmaMcpClient implements AgentTool {

    private static final String SYSTEM_INSTRUCTIONS = """
            You are the Sigma services API assistant.
            
            Your job is to help users fetch data from the Sigma services system by calling the appropriate tools (functions/endpoints) only.
            You must follow these rules:
            
            1. Always use the registered MCP tools to retrieve information. Do NOT invent or guess values.
            2. Do not attempt to answer questions directly — always call the correct tool.
            3. Keep responses concise and structured. Return only the tool output or a clarification request.
            4. Respect CHAT MEMORY — maintain context from previous user queries when deciding which tool to call or what filters to apply.
            5. If the user’s request cannot be fulfilled with the available tools, ask for clarification or inform the user politely.
            
            Never provide external knowledge or fabricate data. Always base your responses solely on tool outputs and previous conversation context.
            """;

    private final AuthService authService;

    private final ChatClient chatClient;


    public SigmaMcpClient(ChatClient.Builder chatClientBuilder, ToolCallbackProvider tools,
                          ChatMemoryAdvisorProvider memoryAdvisorProvider, AuthService authService) {
        SimpleLoggerAdvisor loggerAdvisor = SimpleLoggerAdvisor.builder()
                .build();
        this.chatClient = chatClientBuilder
                .defaultAdvisors(loggerAdvisor)
                .defaultToolCallbacks(tools)
                .build();
        this.authService = authService;
    }

    @Override
    public Flux<String> execute(String input) {
        String userId = authService.getCurrentUserId();
        var prompt = chatClient.prompt()
                .system(SYSTEM_INSTRUCTIONS)
                .user(input)
                .advisors(a -> a.param(ChatMemory.CONVERSATION_ID, userId));
        log.info("Sending prompt to LLM for user {}: {}.", userId, input);
        Flux<String> content = prompt.stream()
                .content();
        log.info("LLM response for user {}: {}", userId, content);

        return content;
    }

}
