package iaf.ofek.gisma.ai.agent.orchestrator.planner;

import iaf.ofek.gisma.ai.agent.llmCall.LLMCallerService;
import iaf.ofek.gisma.ai.agent.prompt.PromptFormat;
import iaf.ofek.gisma.ai.dto.agent.PlanExecutionResult;
import iaf.ofek.gisma.ai.dto.agent.UserPrompt;
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
            - The response should perfectly match the RESPONSE FORMAT
            """;


    private static final String USER_PROMPT_TEMPLATE = """
            ### User Query
            {query}
            
            ### Aggregated Step Outputs
            {plan_aggregated_output}
            
            ### Execution Status
            Overall Success: {plan_overall_success}
            
            ### RESPONSE FORMAT
            {response_format}
            """;


    public Flux<String> synthesizeResponse(UserPrompt prompt, PlanExecutionResult executionResult, String chatId) {
        String aggregatedOutput = executionResult.aggregatedOutput() != null ? executionResult.aggregatedOutput() : "<No output available>";
        String userMessage = USER_PROMPT_TEMPLATE
                .replace(PromptFormat.QUERY, prompt.query())
                .replace(PromptFormat.PLAN_AGGREGATED_OUTPUT, aggregatedOutput)
                .replace(PromptFormat.PLAN_OVERALL_SUCCESS, String.valueOf(executionResult.success()))
                .replace(PromptFormat.RESPONSE_FORMAT, prompt.responseFormat()
                        .getFormat(prompt.schemaJson()));

        return llmCallerService.callLLM(chatClient ->
                        chatClient.prompt()
                                .system(SYSTEM_INSTRUCTIONS)
                                .user(userMessage), chatId)
                .onErrorResume(ex -> Mono.just("Something went wrong, try again... "));

    }
}

