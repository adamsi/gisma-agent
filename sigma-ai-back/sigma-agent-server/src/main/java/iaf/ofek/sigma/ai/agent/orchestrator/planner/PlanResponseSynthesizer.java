package iaf.ofek.sigma.ai.agent.orchestrator.planner;

import iaf.ofek.sigma.ai.agent.llmCall.LLMCallerService;
import iaf.ofek.sigma.ai.agent.prompt.PromptFormat;
import iaf.ofek.sigma.ai.dto.agent.PlanExecutionResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
@RequiredArgsConstructor
public class PlanResponseSynthesizer {

    private final LLMCallerService llmCallerService;

    private static final String SYSTEM_INSTRUCTIONS = """
        You are the Sigma AI Response Synthesizer.

        Your job is to produce a single, clear, and concise response to the user's query
        based on the outputs of multiple execution steps.

        Guidelines:
        - Respect the aggregated output already provided in the PlanExecutionResult.
        - If some steps failed, indicate that certain information may be incomplete.
        - Be concise, factual, and helpful.
        - Do not invent information.
        """;

    private static final String USER_PROMPT_TEMPLATE = """
        User Query: {query}

        Aggregated Steps Output:
        {plan_aggregated_output}

        Overall Success: {plan_overall_success}

        Please synthesize a coherent final response based on the above information.
        """;

    public Flux<String> synthesizeResponse(String userQuery, PlanExecutionResult executionResult) {
        String aggregatedOutput = executionResult.aggregatedOutput() != null ? executionResult.aggregatedOutput() : "<No output available>";
        String userMessage = USER_PROMPT_TEMPLATE
                .replace(PromptFormat.QUERY, userQuery)
                .replace(PromptFormat.PLAN_AGGREGATED_OUTPUT, aggregatedOutput)
                .replace(PromptFormat.PLAN_OVERALL_SUCCESS, String.valueOf(executionResult.success()));

        return llmCallerService.callLLM(chatClient ->
                        chatClient.prompt()
                                .system(SYSTEM_INSTRUCTIONS)
                                .user(userMessage))
                .onErrorResume(ex -> Mono.just("Something went wrong, try again... "));

    }
}

