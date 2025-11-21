package iaf.ofek.gisma.ai.agent.orchestrator.legacy.router;

import iaf.ofek.gisma.ai.dto.agent.PreflightClassifierResult;
import iaf.ofek.gisma.ai.enums.ActionMode;
import iaf.ofek.gisma.ai.enums.ToolManifest;
import iaf.ofek.gisma.ai.agent.orchestrator.legacy.executor.ActionModeExecutor;
import iaf.ofek.gisma.ai.agent.orchestrator.legacy.executor.DirectToolExecutor;
import iaf.ofek.gisma.ai.agent.orchestrator.legacy.planner.PlanOrchestrator;
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
