package iaf.ofek.sigma.ai.agent.orchestrator.reasoner;

import iaf.ofek.sigma.ai.agent.llmCall.LLMCallerService;
import iaf.ofek.sigma.ai.agent.orchestrator.executor.StepExecutor;
import iaf.ofek.sigma.ai.agent.prompt.PromptFormat;
import iaf.ofek.sigma.ai.dto.agent.PlannerStep;
import iaf.ofek.sigma.ai.dto.agent.StepExecutionResult;
import iaf.ofek.sigma.ai.util.ReactiveUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

@Service
@RequiredArgsConstructor
public class LLMReasoner implements StepExecutor {

    private static final String SYSTEM_INSTRUCTIONS = """
            You are the Sigma reasoning engine.
            
            Your task is to perform concise and accurate reasoning based on the step description and query.
            
            Guidelines:
            - Base your response only on the step description and query provided.
            - Do not perform retrieval, tool calls, or planning.
            - Keep your answer clear, direct, and logically sound.
            - Avoid unnecessary verbosity or repetition.
            - If information is insufficient, indicate what is missing instead of guessing.
            """;

    private static final String USER_PROMPT_TEMPLATE = """
            ### STEP DESCRIPTION:
            {step_description}
            
            ### USER QUERY:
            {query}
            """;

    private final LLMCallerService llmCallerService;

    @Override
    public Mono<StepExecutionResult> executeStep(PlannerStep step) {
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
                        StepExecutionResult.class
                ));
    }

}
