package iaf.ofek.sigma.ai.service.agent.tools.rag;

import iaf.ofek.sigma.ai.dto.agent.QuickShotResponse;
import iaf.ofek.sigma.ai.dto.agent.ToolManifest;
import iaf.ofek.sigma.ai.service.agent.prompt.PromptMessageFormater;
import iaf.ofek.sigma.ai.service.agent.tools.AgentTool;
import iaf.ofek.sigma.ai.service.agent.llmCaller.LLMCallerService;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.chat.client.advisor.vectorstore.QuestionAnswerAdvisor;
import org.springframework.ai.chat.prompt.PromptTemplate;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

@Service
@RequiredArgsConstructor
public class RagService implements AgentTool {

    private static final String SYSTEM_INSTRUCTIONS = """
            You are the Sigma-services system assistant.
            
            Your job is to help users understand and use the Sigma System APIs and documentation.
            You must answer **only** based on the information provided in:
            
            1. DOCUMENT CONTEXT — relevant fragments of sigma-services API documentation or design notes.
            2. USER QUERY — the user’s current message.
            
            Guidelines:
            - Always use the retrieved documentation as your source of truth.
            - If unsure, ask the user to clarify their question.
            - Never invent information about the Sigma System.
            - Keep your answers concise, technical, and helpful.
            - When appropriate, reference endpoint names, parameters, or examples from the documentation.
            """;

    private static final String QUICK_SHOT_SYSTEM_MESSAGE = """
        You are the Sigma Knowledge Context Extractor.
        Retrieve the most relevant Sigma documentation fragments.

        Guidelines:
        - Always respond in strict JSON format matching this schema:
        
        {schema_json}

        Additional Instructions:
        - Summarize key API concepts, parameters, and relevant sections that relate to the user's query.
        - Include concise references to endpoints or entities if relevant.
        - Be concise and factual.
        """;


    private static final String USER_PROMPT_TEMPLATE = """
            ### DOCUMENT CONTEXT:
            {question_answer_context}
            
            ### USER QUERY:
            {query}
            """;

    private static final String QUICK_SHOT_SCHEMA = """
            {
              "$schema": "http://json-schema.org/draft-07/schema#",
              "title": "QuickShotResponse",
              "type": "object",
              "properties": {
                "responseText": {
                  "type": "string",
                  "description": "Raw LLM output"
                },
                "confidenceScore": {
                  "type": "number",
                  "minimum": 0.0,
                  "maximum": 1.0,
                  "description": "Confidence score between 0 and 1"
                },
                "requiresDataFetching": {
                  "type": "boolean",
                    "description": "Set to true only if you are certain that further API or RAG calls are required. Otherwise leave false."
                },
                "requiresPlanning": {
                  "type": "boolean",
                  "description": "Set to true only if you are certain multi-step planning is required. Otherwise leave false."
                }
              },
              "required": ["responseText", "confidenceScore"],
              "additionalProperties": false
            }
            """;

    private final LLMCallerService llmCallerService;


    private final VectorStore documentVectorStore;

    @Override
    public Flux<String> execute(String query) {
        QuestionAnswerAdvisor qaAdvisor = QuestionAnswerAdvisor.builder(documentVectorStore)
                .promptTemplate(new PromptTemplate(USER_PROMPT_TEMPLATE))
                .build();

        return llmCallerService.callLLM(chatClient -> chatClient.prompt()
                .system(SYSTEM_INSTRUCTIONS)
                .user(query)
                .advisors(qaAdvisor));
    }

    public QuickShotResponse quickShotSimilaritySearch(String query) {
        QuestionAnswerAdvisor qaAdvisor = QuestionAnswerAdvisor.builder(documentVectorStore)
                .build();
        String systemMessage = PromptMessageFormater.SCHEMA_JSON.format(QUICK_SHOT_SYSTEM_MESSAGE, QUICK_SHOT_SCHEMA);

        return llmCallerService.callLLMWithSchemaValidation(chatClient ->
                chatClient.prompt()
                        .system(systemMessage)
                        .user(query)
                        .advisors(qaAdvisor), QuickShotResponse.class);
    }

    @Override
    public ToolManifest manifest() {
        return ToolManifest.builder()
                .name("RagAgentTool")
                .description("Retrieves and summarizes Sigma API documentation for reasoning or answering.")
                .build();
    }

}
