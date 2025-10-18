package iaf.ofek.sigma.ai.agent.orchestrator.planner;

import iaf.ofek.sigma.ai.agent.orchestrator.executor.ActionModeExecutor;
import iaf.ofek.sigma.ai.dto.agent.PreflightClassifierResult;
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
    public Flux<String> execute(String query, PreflightClassifierResult classifierResponse) {
        return plannerService.plan(query, classifierResponse)
                .flatMap(planStepsExecutor::executePlan)
                .flatMapMany(planExecutionResult ->
                        planResponseSynthesizer.synthesizeResponse(query, planExecutionResult));
    }

}
