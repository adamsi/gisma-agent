package iaf.ofek.sigma.ai.service.agent.tools.rag;

import iaf.ofek.sigma.ai.dto.ToolManifest;
import iaf.ofek.sigma.ai.service.agent.memory.ChatMemoryAdvisorProvider;
import iaf.ofek.sigma.ai.service.agent.tools.AgentTool;
import iaf.ofek.sigma.ai.service.auth.AuthService;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.SimpleLoggerAdvisor;
import org.springframework.ai.chat.client.advisor.vectorstore.QuestionAnswerAdvisor;
import org.springframework.ai.chat.client.advisor.vectorstore.VectorStoreChatMemoryAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.prompt.PromptTemplate;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.util.Optional;

@Service
public class RagService implements AgentTool {

    private static final String SYSTEM_INSTRUCTIONS = """
            You are the Sigma-services system assistant.
            
            Your job is to help users understand and use the Sigma System APIs and documentation.
            You must answer **only** based on the information provided in:
            
            1. CHAT MEMORY — previous conversation turns with the user.
            2. DOCUMENT CONTEXT — relevant fragments of sigma-services API documentation or design notes.
            3. USER QUERY — the user’s current message.
            
            Guidelines:
            - Always use the retrieved documentation as your source of truth.
            - If unsure, ask the user to clarify their question.
            - Never invent information about the Sigma System.
            - Keep your answers concise, technical, and helpful.
            - When appropriate, reference endpoint names, parameters, or examples from the documentation.
            """;

    private static final String CONTEXTUALIZE_SYSTEM_PROMPT = """
        You are the Sigma Knowledge Context Extractor.
        Your task is to help the orchestrator understand the user's intent
        and retrieve the most relevant Sigma documentation fragments.
        
        Guidelines:
        - DO NOT answer the user directly.
        - Summarize key API concepts, parameters, and sections
          that relate to the user's query.
        - Include short references to endpoints or entities if relevant.
        - Be concise (max 5 sentences).
    """;



    private static final String USER_PROMPT_TEMPLATE = """
            ### DOCUMENT CONTEXT:
            {question_answer_context}
            
            ### USER QUERY:
            {query}
            """;

    private final ChatClient chatClient;

    private final ChatMemoryAdvisorProvider memoryAdvisorProvider;

    public RagService(ChatMemoryAdvisorProvider memoryAdvisorProvider,
                      ChatClient.Builder builder,
                      @Qualifier("documentVectorStore") VectorStore documentVectorStore) {
        this.memoryAdvisorProvider = memoryAdvisorProvider;
        SimpleLoggerAdvisor loggerAdvisor = SimpleLoggerAdvisor.builder()
                .order(0)
                .build();

        VectorStoreChatMemoryAdvisor memoryAdvisor = memoryAdvisorProvider.longTermChatMemoryAdvisor(1);

        QuestionAnswerAdvisor qaAdvisor = QuestionAnswerAdvisor.builder(documentVectorStore)
                .order(2)
                .promptTemplate(new PromptTemplate(USER_PROMPT_TEMPLATE))
                .build();

        this.chatClient = builder
                .defaultAdvisors(loggerAdvisor, qaAdvisor, memoryAdvisor)
                .build();
    }

    @Override
    public Flux<String> execute(String query) {
        return chatClient.prompt()
                .system(SYSTEM_INSTRUCTIONS)
                .user(query)
                .advisors(memoryAdvisorProvider.shortTermMemoryAdvisor())
                .stream()
                .content();
    }

    @Override
    public Optional<String> contextualize(String query) {
        String contextSummary = chatClient.prompt()
                .system(CONTEXTUALIZE_SYSTEM_PROMPT)
                .user(query)
                .advisors(memoryAdvisorProvider.shortTermMemoryAdvisor())
                .call()
                .content();

        return Optional.ofNullable(contextSummary);
    }

    @Override
    public ToolManifest manifest() {
        return ToolManifest.builder()
                .name("RagAgentTool")
                .description("Retrieves and summarizes Sigma API documentation for reasoning or answering.")
                .build();
    }

}
