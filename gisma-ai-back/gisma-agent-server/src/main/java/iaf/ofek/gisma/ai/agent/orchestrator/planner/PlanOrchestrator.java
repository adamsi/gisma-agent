package iaf.ofek.gisma.ai.agent.orchestrator.planner;

import iaf.ofek.gisma.ai.agent.orchestrator.executor.ActionModeExecutor;
import iaf.ofek.gisma.ai.dto.agent.PreflightClassifierResult;
import iaf.ofek.gisma.ai.dto.agent.UserPrompt;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

@Service
@RequiredArgsConstructor
public class PlanOrchestrator implements ActionModeExecutor {

    private final PlannerService plannerService;

    private final PlanStepsExecutor planStepsExecutor;

    private final PlanResponseSynthesizer planResponseSynthesizer;

    @Override
    public Flux<String> execute(UserPrompt prompt, PreflightClassifierResult classifierResponse, String chatId) {
        return plannerService.plan(prompt.query(), classifierResponse, chatId)
                .flatMap((result)-> planStepsExecutor.executePlan(result, chatId))
                .flatMapMany(planExecutionResult ->
                        planResponseSynthesizer.synthesizeResponse(prompt, planExecutionResult, chatId));
    }

}
