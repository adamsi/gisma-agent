package iaf.ofek.sigma.ai.agent.orchestrator;

import iaf.ofek.sigma.ai.dto.agent.PreflightClassifierResponse;
import iaf.ofek.sigma.ai.dto.agent.QuickShotResponse;
import iaf.ofek.sigma.ai.enums.ToolManifest;
import iaf.ofek.sigma.ai.agent.orchestrator.classifier.PreflightClassifierService;
import iaf.ofek.sigma.ai.agent.orchestrator.executor.ActionModeExecutor;
import iaf.ofek.sigma.ai.agent.orchestrator.router.ActionModeExecutorRouter;
import iaf.ofek.sigma.ai.agent.tools.rag.RagService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.util.Objects;

@Service
@RequiredArgsConstructor
public class AgentOrchestrator {

    private final RagService ragService;

    private final PreflightClassifierService preflightClassifierService;

    private final ActionModeExecutorRouter actionModeExecutorRouter;

    public Flux<String> handleQuery(String query) {
        return ragService.quickShotSimilaritySearch(query)
                .flatMap(quickShotResponse -> preflightClassifierService.classify(query, quickShotResponse))
                .flatMapMany(preflightClassifierResponse -> {
                    if (preflightClassifierResponse.sufficient()) {
                        return Flux.just(preflightClassifierResponse.rephrasedResponse());
                    }

                    ActionModeExecutor executor = actionModeExecutorRouter.route(preflightClassifierResponse);

                    return executor.execute(query, preflightClassifierResponse);
                });
    }

    public String handleQueryBlocking(String query) {
        String toolsManifest = ToolManifest.describeAll();

        QuickShotResponse quickShotResponse = ragService.quickShotSimilaritySearch(query).block();

        if (quickShotResponse == null) {
            throw new IllegalArgumentException("quickShotResponse must not be null");
        }

        PreflightClassifierResponse preflightClassifierResponse =  preflightClassifierService.classify(query, quickShotResponse).block();

        if (preflightClassifierResponse == null) {
            throw new IllegalArgumentException("quickShotResponse must not be null");
        }

        if (preflightClassifierResponse.sufficient()) {
            return preflightClassifierResponse.rephrasedResponse();
        }

        ActionModeExecutor executor = actionModeExecutorRouter.route(preflightClassifierResponse);

        return String.join(
                "\n",
                Objects.requireNonNull(executor.execute(query, preflightClassifierResponse).collectList()                       // Collect all Flux<String> items into List<String>
                .block())
        );
    }


}
