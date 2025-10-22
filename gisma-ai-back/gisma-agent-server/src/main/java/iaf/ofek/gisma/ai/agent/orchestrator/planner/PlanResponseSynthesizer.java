package iaf.ofek.gisma.ai.agent.orchestrator.planner;

import iaf.ofek.gisma.ai.agent.llmCall.LLMCallerService;
import iaf.ofek.gisma.ai.agent.prompt.PromptFormat;
import iaf.ofek.gisma.ai.dto.agent.PlanExecutionResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
@RequiredArgsConstructor
public class PlanResponseSynthesizer {

    private final LLMCallerService llmCallerService;

    private static final String SYSTEM_INSTRUCTIONS = """
            You are the Gisma Synthesizer.
            
            Goal:
            Produce a single, coherent, and factual answer to the user's query 
            based on the provided plan execution data.
            
            Rules:
            - Use only the given information; do not speculate or add facts.
            - If any step failed, mention that results may be incomplete.
            - Keep the response clear, concise, and user-ready.
            """;


    private static final String USER_PROMPT_TEMPLATE = """
            ### User Query
            {query}
            
            ### Aggregated Step Outputs
            {plan_aggregated_output}
            
            ### Execution Status
            Overall Success: {plan_overall_success}
            
            Please write a unified final answer using the above context.
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

