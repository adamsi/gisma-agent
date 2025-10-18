package iaf.ofek.sigma.ai.agent.orchestrator.executor;

import iaf.ofek.sigma.ai.dto.agent.PlannerStep;
import iaf.ofek.sigma.ai.dto.agent.StepExecutionResult;
import reactor.core.publisher.Mono;

public interface StepExecutor {

    Mono<StepExecutionResult> executeStep(PlannerStep step);

}
