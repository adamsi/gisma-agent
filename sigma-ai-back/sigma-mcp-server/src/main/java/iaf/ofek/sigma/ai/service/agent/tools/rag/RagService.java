package iaf.ofek.sigma.ai.service.agent.tools.rag;

import iaf.ofek.sigma.ai.service.agent.memory.ChatMemoryAdvisorProvider;
import iaf.ofek.sigma.ai.service.agent.tools.AgentTool;
import iaf.ofek.sigma.ai.service.auth.AuthService;
import iaf.ofek.sigma.ai.service.ingestion.DocumentProcessor;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.SimpleLoggerAdvisor;
import org.springframework.ai.chat.client.advisor.vectorstore.QuestionAnswerAdvisor;
import org.springframework.ai.chat.client.advisor.vectorstore.VectorStoreChatMemoryAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.prompt.PromptTemplate;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

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



    private static final String USER_PROMPT_TEMPLATE = """
            ### DOCUMENT CONTEXT:
            {question_answer_context}
            
            ### USER QUERY:
            {query}
            """;

    private final AuthService authService;

    private final ChatClient chatClient;

    public RagService(AuthService authService,
                      ChatMemoryAdvisorProvider memoryAdvisorProvider,
                      ChatClient.Builder builder,
                      @Qualifier("documentVectorStore") VectorStore documentVectorStore) {
        this.authService = authService;
        SimpleLoggerAdvisor headLogger = SimpleLoggerAdvisor.builder().order(0).build();

        VectorStoreChatMemoryAdvisor memoryAdvisor = memoryAdvisorProvider.chatMemoryAdvisor(1);

        QuestionAnswerAdvisor qaAdvisor = QuestionAnswerAdvisor.builder(documentVectorStore)
                .order(2)
                .promptTemplate(new PromptTemplate(USER_PROMPT_TEMPLATE))
                .build();

        SimpleLoggerAdvisor tailLogger = SimpleLoggerAdvisor.builder().order(3).build();
        this.chatClient = builder
                .defaultAdvisors(headLogger, qaAdvisor, memoryAdvisor, tailLogger)
                .build();
    }

    public String execute(String query) {
        String userId = authService.getCurrentUserId();
        String filter = String.format("%s == '%s'", DocumentProcessor.USER_ID, userId);

        return chatClient.prompt()
                .system(SYSTEM_INSTRUCTIONS)
                .user(query)
                .advisors(a -> a.param(ChatMemory.CONVERSATION_ID, userId))
                .advisors(a -> a.param(QuestionAnswerAdvisor.FILTER_EXPRESSION, filter))
                .call()
                .content();
    }
}
