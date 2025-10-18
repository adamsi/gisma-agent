package iaf.ofek.sigma.ai.agent.orchestrator.executor;

import iaf.ofek.sigma.ai.agent.orchestrator.planner.PlannerService;
import iaf.ofek.sigma.ai.dto.agent.PreflightClassifierResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

@Service
@RequiredArgsConstructor
public class PlanExecutor implements ActionModeExecutor {

    private final PlannerService plannerService;

    @Override
    public Flux<String> execute(String query, PreflightClassifierResponse classifierResponse) {
        return null;
    }

}
