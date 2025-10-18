package iaf.ofek.sigma.ai.agent.orchestrator.router;

import iaf.ofek.sigma.ai.dto.agent.PreflightClassifierResult;
import iaf.ofek.sigma.ai.enums.ActionMode;
import iaf.ofek.sigma.ai.enums.ToolManifest;
import iaf.ofek.sigma.ai.agent.orchestrator.executor.ActionModeExecutor;
import iaf.ofek.sigma.ai.agent.orchestrator.executor.DirectToolExecutor;
import iaf.ofek.sigma.ai.agent.orchestrator.planner.PlanOrchestrator;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Log4j2
public class ActionModeExecutorRouter {

    private final Map<ToolManifest, DirectToolExecutor> toolMap;

    private final PlanOrchestrator planOrchestrator;


    public ActionModeExecutor route(PreflightClassifierResult classifierResponse) {
        ActionMode actionMode = classifierResponse.actionMode();

        switch (actionMode) {
            case DIRECT_TOOL -> {
                if (toolMap.isEmpty()) {
                    log.warn("failed routing, direct tool map is empty");
                    throw new RuntimeException("direct tool map is empty");
                }

                return toolMap.get(classifierResponse.tools().get(0));
            }

            case PLANNER ->
            {
                return planOrchestrator;
            }

            default -> throw new IllegalArgumentException("Received Invalid ActionMode");
        }
    }

}
