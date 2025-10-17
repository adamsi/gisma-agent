package iaf.ofek.sigma.ai.service.agent.orchestrator;

import iaf.ofek.sigma.ai.dto.agent.PreflightClassifierResponse;
import iaf.ofek.sigma.ai.dto.agent.QuickShotResponse;
import iaf.ofek.sigma.ai.enums.ToolManifest;
import iaf.ofek.sigma.ai.service.agent.orchestrator.classifier.PreflightClassifierService;
import iaf.ofek.sigma.ai.service.agent.orchestrator.executor.ActionModeExecutor;
import iaf.ofek.sigma.ai.service.agent.orchestrator.executor.ActionModeExecutorRouter;
import iaf.ofek.sigma.ai.service.agent.tools.rag.RagService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

@Service
@RequiredArgsConstructor
public class AgentOrchestrator {

    private final RagService ragService;

    private final PreflightClassifierService preflightClassifierService;

    private final ActionModeExecutorRouter actionModeExecutorRouter;

    public Flux<String> handleQuery(String query) {
        String toolsManifest = ToolManifest.describeAll();
        QuickShotResponse quickShotResponse = ragService.quickShotSimilaritySearch(query);
        PreflightClassifierResponse preflightClassifierResponse = preflightClassifierService.classify(query, quickShotResponse, toolsManifest);

        if (preflightClassifierResponse.sufficient()) {
         return Flux.just(preflightClassifierResponse.rephrasedResponse());
        }

        ActionModeExecutor actionModeExecutor = actionModeExecutorRouter.route(preflightClassifierResponse);

        return actionModeExecutor.execute(quickShotResponse, toolsManifest);
    }

    public String handleQueryBlocking(String input) {

    }


}
