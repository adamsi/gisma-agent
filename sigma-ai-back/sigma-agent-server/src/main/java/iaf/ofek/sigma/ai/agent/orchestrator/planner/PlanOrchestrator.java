package iaf.ofek.sigma.ai.agent.orchestrator.planner;

import iaf.ofek.sigma.ai.agent.orchestrator.executor.ActionModeExecutor;
import iaf.ofek.sigma.ai.dto.agent.PreflightClassifierResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

@Service
@RequiredArgsConstructor
public class PlanOrchestrator implements ActionModeExecutor {

    private final PlannerService plannerService;

    @Override
    public Flux<String> execute(String query, PreflightClassifierResult classifierResponse) {
        plannerService.plan(query, classifierResponse);
    }

}
