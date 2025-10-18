package iaf.ofek.sigma.ai.agent.tools.rag;

import iaf.ofek.sigma.ai.agent.prompt.PromptFormat;
import iaf.ofek.sigma.ai.dto.agent.PreflightClassifierResponse;
import iaf.ofek.sigma.ai.dto.agent.QuickShotResponse;
import iaf.ofek.sigma.ai.agent.orchestrator.executor.DirectToolExecutor;
import iaf.ofek.sigma.ai.agent.llmCaller.LLMCallerService;
import iaf.ofek.sigma.ai.util.ReactiveUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.chat.client.advisor.vectorstore.QuestionAnswerAdvisor;
import org.springframework.ai.chat.prompt.PromptTemplate;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
@RequiredArgsConstructor
public class RagService implements DirectToolExecutor {

    private static final String SYSTEM_INSTRUCTIONS = """
            You are the Sigma-services system assistant.
            
            Your job is to help users understand and use the Sigma System APIs and documentation.
            You must answer **only** based on the information provided in:
            
            1. DOCUMENT CONTEXT — relevant fragments of sigma-services API documentation or design notes.
            2. USER QUERY — the user’s current message.
            3. QUICKSHOT RESPONSE — the output of the QuickShot similarity search, which may already contain a sufficient answer.
            
            Guidelines:
            - If the QUICKSHOT RESPONSE is already sufficient, focus on rephrasing,and improving response if possible.
            - If more information is needed, reason carefully based on DOCUMENT CONTEXT and USER QUERY.
            - Only include tools or multi-step planning if explicitly required to answer the query.
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
            
            ### QUICKSHOT RESPONSE:
            {quickshot_response}
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
    public Flux<String> execute(String query, PreflightClassifierResponse classifierResponse) {
        String userMessage = USER_PROMPT_TEMPLATE
                .replace(PromptFormat.QUERY, query)
                .replace(PromptFormat.QUICKSHOT_RESPONSE, classifierResponse.rephrasedResponse());
        QuestionAnswerAdvisor qaAdvisor = QuestionAnswerAdvisor.builder(documentVectorStore)
                .promptTemplate(new PromptTemplate(userMessage))
                .build();

        return llmCallerService.callLLM(chatClient -> chatClient.prompt()
                .system(SYSTEM_INSTRUCTIONS)
                .user(query)
                .advisors(qaAdvisor));
    }

    public Mono<QuickShotResponse> quickShotSimilaritySearch(String query) {
        QuestionAnswerAdvisor qaAdvisor = QuestionAnswerAdvisor.builder(documentVectorStore)
                .build();
        String systemMessage = QUICK_SHOT_SYSTEM_MESSAGE.replace(PromptFormat.SCHEMA_JSON, QUICK_SHOT_SCHEMA);

        return ReactiveUtils.runBlockingAsync(()-> llmCallerService.callLLMWithSchemaValidation(chatClient ->
                chatClient.prompt()
                        .system(systemMessage)
                        .user(query)
                        .advisors(qaAdvisor), QuickShotResponse.class));
    }

}
