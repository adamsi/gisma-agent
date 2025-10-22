package iaf.ofek.gisma.ai.agent.orchestrator.executor;

import iaf.ofek.gisma.ai.dto.agent.PreflightClassifierResult;
import reactor.core.publisher.Flux;

public interface ActionModeExecutor {

    Flux<String> execute(String query, PreflightClassifierResult classifierResponse);

}
