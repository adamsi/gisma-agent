package iaf.ofek.sigma.ai.agent.orchestrator.executor;

import iaf.ofek.sigma.ai.dto.agent.PreflightClassifierResponse;
import reactor.core.publisher.Flux;

public interface ActionModeExecutor {

    Flux<String> execute(String query, PreflightClassifierResponse classifierResponse, String toolsManifest);

}
