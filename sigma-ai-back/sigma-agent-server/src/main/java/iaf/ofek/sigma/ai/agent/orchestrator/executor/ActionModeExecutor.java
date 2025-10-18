package iaf.ofek.sigma.ai.agent.orchestrator.executor;

import iaf.ofek.sigma.ai.dto.agent.PreflightClassifierResult;
import reactor.core.publisher.Flux;

public interface ActionModeExecutor {

    Flux<String> execute(String query, PreflightClassifierResult classifierResponse);

}
