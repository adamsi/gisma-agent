package iaf.ofek.sigma.ai.agent.orchestrator.executor;

import iaf.ofek.sigma.ai.dto.agent.PreflightClassifierResponse;
import reactor.core.publisher.Flux;

public interface DirectToolExecutor extends ActionModeExecutor {

    @Override
    default Flux<String> execute(String query, PreflightClassifierResponse classifierResponse, String toolsManifest) {
        return execute(query, classifierResponse);
    }

    Flux<String> execute(String query, PreflightClassifierResponse classifierResponse);

}
