package iaf.ofek.gisma.ai.agent.orchestrator.reasoner;

import iaf.ofek.gisma.ai.agent.llmCall.LLMCallerWithMemoryService;
import iaf.ofek.gisma.ai.agent.orchestrator.executor.StepExecutor;
import iaf.ofek.gisma.ai.agent.prompt.PromptFormat;
import iaf.ofek.gisma.ai.dto.agent.PlannerStep;
import iaf.ofek.gisma.ai.dto.agent.StepExecutionResult;
import iaf.ofek.gisma.ai.util.ReactiveUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

@Service
@RequiredArgsConstructor
public class LLMReasoner implements StepExecutor {

    private static final String SYSTEM_INSTRUCTIONS = """
            You are the Gisma Reasoner.
            
            Task:
            Answer clearly using only the step description and query.
            
            Rules:
            - Use only given context.
            - Be concise and factual.
            - If data is missing, say what’s unclear.
            """;

    private static final String USER_PROMPT_TEMPLATE = """
            ### STEP DESCRIPTION:
            {step_description}
            
            ### USER QUERY:
            {query}
            """;

    private final LLMCallerWithMemoryService llmCallerService;

    @Override
    public Mono<StepExecutionResult> executeStep(PlannerStep step, String chatId) {
        String query = step.query() != null ? step.query() : "";
        String description = step.description() != null ? step.description() : "";

        String userMessage = USER_PROMPT_TEMPLATE
                .replace(PromptFormat.QUERY, query)
                .replace(PromptFormat.STEP_DESCRIPTION, description);

        return ReactiveUtils.runBlockingAsync(() ->
                llmCallerService.callLLMWithSchemaValidation(
                        chatClient -> chatClient.prompt()
                                .system(SYSTEM_INSTRUCTIONS)
                                .user(userMessage),
                        StepExecutionResult.class,
                        chatId
                ));
    }

}
