package iaf.ofek.sigma.ai.service.agent.orchestrator.executor;

import iaf.ofek.sigma.ai.dto.agent.QuickShotResponse;
import reactor.core.publisher.Flux;

public interface ActionModeExecutor {

    Flux<String> execute(QuickShotResponse quickShotResponse, String toolsManifest);

}
