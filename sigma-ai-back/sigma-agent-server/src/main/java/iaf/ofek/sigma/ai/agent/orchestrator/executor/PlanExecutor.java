package iaf.ofek.sigma.ai.agent.orchestrator.executor;

import iaf.ofek.sigma.ai.dto.agent.PreflightClassifierResponse;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

@Service
public class PlanExecutor implements ActionModeExecutor {

    @Override
    public Flux<String> execute(String query, PreflightClassifierResponse classifierResponse, String toolsManifest) {
        return null;
    }

}
