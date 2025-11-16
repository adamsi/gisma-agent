package iaf.ofek.gisma.ai.agent.orchestrator.executor;

import iaf.ofek.gisma.ai.dto.agent.PlannerStep;
import iaf.ofek.gisma.ai.dto.agent.StepExecutionResult;
import reactor.core.publisher.Mono;

import java.util.UUID;

public interface StepExecutor {

    Mono<StepExecutionResult> executeStep(PlannerStep step, String chatId);

}
