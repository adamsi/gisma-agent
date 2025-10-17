package iaf.ofek.sigma.ai.agent.orchestrator.router;

import iaf.ofek.sigma.ai.dto.agent.PreflightClassifierResponse;
import iaf.ofek.sigma.ai.enums.ActionMode;
import iaf.ofek.sigma.ai.enums.ToolManifest;
import iaf.ofek.sigma.ai.agent.orchestrator.executor.ActionModeExecutor;
import iaf.ofek.sigma.ai.agent.orchestrator.executor.DirectToolExecutor;
import iaf.ofek.sigma.ai.agent.orchestrator.executor.PlanExecutor;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Log4j2
public class ActionModeExecutorRouter {

    private final Map<ToolManifest, DirectToolExecutor> toolMap;

    private final PlanExecutor planExecutor;


    public ActionModeExecutor route(PreflightClassifierResponse classifierResponse) {
        if (classifierResponse.actionMode().equals(ActionMode.DIRECT_TOOL)) {
            if (toolMap.isEmpty()) {
                log.warn("failed routing, direct tool map is empty");
                throw new RuntimeException("direct tool map is empty");
            }

            return toolMap.get(classifierResponse.tools().get(0));
        }

        return planExecutor;
    }

}
