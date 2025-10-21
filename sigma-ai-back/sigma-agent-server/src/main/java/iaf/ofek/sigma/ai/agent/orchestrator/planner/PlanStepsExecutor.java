package iaf.ofek.sigma.ai.agent.orchestrator.planner;

import iaf.ofek.sigma.ai.agent.orchestrator.executor.StepExecutor;
import iaf.ofek.sigma.ai.dto.agent.PlanExecutionResult;
import iaf.ofek.sigma.ai.dto.agent.PlannerResult;
import iaf.ofek.sigma.ai.dto.agent.PlannerStep;
import iaf.ofek.sigma.ai.dto.agent.StepExecutionResult;
import iaf.ofek.sigma.ai.enums.ToolManifest;
import iaf.ofek.sigma.ai.util.ReactiveUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Log4j2
public class PlanStepsExecutor {

    private final Map<ToolManifest, StepExecutor> planStepExecutorMap;

    public Mono<PlanExecutionResult> executePlan(PlannerResult plannerResult) {
        List<StepExecutionResult> stepResults = new ArrayList<>();

        return Flux.fromIterable(plannerResult.steps())
                .flatMap(this::executeStep)
                .doOnNext(stepResults::add)
                .then(ReactiveUtils.runBlockingAsync(() -> {
                    boolean overallSuccess = stepResults.stream()
                            .allMatch(StepExecutionResult::success);

                    return PlanExecutionResult.buildResult(overallSuccess, stepResults);
                }));
    }

    private Mono<StepExecutionResult> executeStep(PlannerStep step) {
        return planStepExecutorMap.get(step.toolCategory())
                .executeStep(step);
    }

}
