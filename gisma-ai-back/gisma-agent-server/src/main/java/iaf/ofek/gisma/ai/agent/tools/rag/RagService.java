package iaf.ofek.gisma.ai.agent.tools.rag;

import iaf.ofek.gisma.ai.agent.llmCall.LLMCallerService;
import iaf.ofek.gisma.ai.agent.memory.ChatMemoryAdvisorProvider;
import iaf.ofek.gisma.ai.agent.orchestrator.executor.DirectToolExecutor;
import iaf.ofek.gisma.ai.agent.orchestrator.executor.StepExecutor;
import iaf.ofek.gisma.ai.agent.prompt.PromptFormat;
import iaf.ofek.gisma.ai.dto.agent.*;
import iaf.ofek.gisma.ai.util.ReactiveUtils;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.vectorstore.QuestionAnswerAdvisor;
import org.springframework.ai.chat.prompt.PromptTemplate;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
public class RagService implements DirectToolExecutor, StepExecutor {

    private static final String SYSTEM_INSTRUCTIONS = """
            You are the Gisma-services assistant.
            
            Task:
            Answer clearly using only the provided context:
            - DOCUMENT CONTEXT
            - USER QUERY
            - QUICKSHOT RESPONSE
            
            Rules:
            - Rephrase or refine if the quickshot is sufficient.
            - Reason carefully if more info is needed.
            - Include tools/steps only if necessary.
            - Never invent data.
            - Be concise and technical.
            """;


    private static final String STEP_SYSTEM_INSTRUCTIONS = """
            You are the Gisma RAG step executor.
            
            Task:
            Produce a concise, factual answer for this step using only:
            - DOCUMENT CONTEXT
            - STEP DESCRIPTION
            
            Rules:
            - No planning, classification, or tool calls.
            - Summarize or refine if info is sufficient.
            - State clearly if data is missing.
            - Be concise, technical, and relevant.
            - Do not invent details.
            """;


    private static final String QUICK_SHOT_SYSTEM_MESSAGE = """
            You are the Gisma Knowledge Extractor.
            
            Task:
            Retrieve the most relevant Gisma documentation fragments/ chat memory data.
            
            Rules:
            - Respond in strict JSON as per {schema_json}.
            - Summarize key API concepts and relevant sections.
            - When the user query is about their personal/session data, retrieve chat memory context.
            - Include concise references to endpoints or entities.
            - Be concise, factual, and precise.
            """;


    private static final String USER_PROMPT_TEMPLATE = """
            ### DOCUMENT CONTEXT:
            {question_answer_context}
            
            ### QUICKSHOT RESPONSE:
            {quickshot_response}
            """;

    private static final String STEP_PROMPT_TEMPLATE = """
             ### STEP DESCRIPTION:
            {step_description}
            
            ### DOCUMENT CONTEXT:
            {question_answer_context}
            """;

    private static final String QUICK_SHOT_PROMPT_TEMPLATE = """
            ### DOCUMENT CONTEXT:
            {question_answer_context}
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

    public RagService(ChatClient.Builder builder, ChatMemoryAdvisorProvider memoryAdvisorProvider,
                      @Qualifier("documentVectorStore") VectorStore documentVectorStore) {
        this.documentVectorStore = documentVectorStore;
        this.llmCallerService = new LLMCallerService(builder, memoryAdvisorProvider);
//        memoryAdvisorProvider.longTermChatMemoryAdvisor(70);
    }

    @Override
    public Flux<String> execute(UserPrompt prompt, PreflightClassifierResult classifierResponse, String chatId) {
        String userMessage = USER_PROMPT_TEMPLATE
                .replace(PromptFormat.QUICKSHOT_RESPONSE, classifierResponse.rephrasedResponse());
        QuestionAnswerAdvisor qaAdvisor = QuestionAnswerAdvisor.builder(documentVectorStore)
                .promptTemplate(new PromptTemplate(userMessage))
                .build();

        return llmCallerService.callLLM(chatClient -> chatClient.prompt()
                .system(SYSTEM_INSTRUCTIONS)
                .user(prompt.query())
                .advisors(qaAdvisor), chatId);
    }

    public Mono<QuickShotResponse> quickShotSimilaritySearch(String query, String chatId) {
        var qaAdvisor = QuestionAnswerAdvisor.builder(documentVectorStore)
                .promptTemplate(new PromptTemplate(QUICK_SHOT_PROMPT_TEMPLATE))
                .order(3)
                .build();
        String systemMessage = QUICK_SHOT_SYSTEM_MESSAGE.replace(PromptFormat.SCHEMA_JSON, QUICK_SHOT_SCHEMA);

        return ReactiveUtils.runBlockingAsync(() -> llmCallerService.callLLMWithSchemaValidation(chatClient ->
                        chatClient.prompt()
                                .system(systemMessage)
                                .user(query)
                                .advisors(qaAdvisor)
                , QuickShotResponse.class, chatId));
    }

    @Override
    public Mono<StepExecutionResult> executeStep(PlannerStep step, String chatId) {
        String query = step.query() != null ? step.query() : "";
        String description = step.description() != null ? step.description() : "";
        String promptTemplate = STEP_PROMPT_TEMPLATE
                .replace(PromptFormat.STEP_DESCRIPTION, description);
        QuestionAnswerAdvisor qaAdvisor = QuestionAnswerAdvisor.builder(documentVectorStore)
                .promptTemplate(new PromptTemplate(promptTemplate))
                .build();

        return ReactiveUtils.runBlockingAsync(() ->
                llmCallerService.callLLMWithSchemaValidation(
                        chatClient -> chatClient.prompt()
                                .system(STEP_SYSTEM_INSTRUCTIONS)
                                .user(query)
                                .advisors(qaAdvisor),
                        StepExecutionResult.class,
                        chatId
                ));
    }


}
