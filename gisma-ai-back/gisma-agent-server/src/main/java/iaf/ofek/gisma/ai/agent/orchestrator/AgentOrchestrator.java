package iaf.ofek.gisma.ai.agent.orchestrator;

import iaf.ofek.gisma.ai.dto.agent.PreflightClassifierResult;
import iaf.ofek.gisma.ai.dto.agent.QuickShotResponse;
import iaf.ofek.gisma.ai.agent.orchestrator.classifier.PreflightClassifierService;
import iaf.ofek.gisma.ai.agent.orchestrator.executor.ActionModeExecutor;
import iaf.ofek.gisma.ai.agent.orchestrator.router.ActionModeExecutorRouter;
import iaf.ofek.gisma.ai.agent.tools.rag.RagService;
import iaf.ofek.gisma.ai.dto.agent.UserPromptDTO;
import iaf.ofek.gisma.ai.util.StringUtils;
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

    public Flux<String> handleQuery(UserPromptDTO prompt) {
        return ragService.quickShotSimilaritySearch(prompt.query())
                .flatMap(quickShotResponse -> preflightClassifierService.classify(prompt.query(), quickShotResponse))
                .flatMapMany(preflightClassifierResponse -> {
                    if (preflightClassifierResponse.sufficient()) {
                        return Flux.just(preflightClassifierResponse.rephrasedResponse());
                    }

                    ActionModeExecutor executor = actionModeExecutorRouter.route(preflightClassifierResponse);

                    return executor.execute(prompt, preflightClassifierResponse);
                });
    }

    public String handleQueryBlocking(UserPromptDTO prompt) {
        QuickShotResponse quickShotResponse = ragService.quickShotSimilaritySearch(prompt.query()).block();

        if (quickShotResponse == null) {
            throw new IllegalArgumentException("quickShotResponse must not be null");
        }

        PreflightClassifierResult preflightClassifierResult =  preflightClassifierService.classify(prompt.query(), quickShotResponse).block();

        if (preflightClassifierResult == null) {
            throw new IllegalArgumentException("quickShotResponse must not be null");
        }

        if (preflightClassifierResult.sufficient()) {
            return preflightClassifierResult.rephrasedResponse();
        }

        ActionModeExecutor executor = actionModeExecutorRouter.route(preflightClassifierResult);

        return StringUtils.joinLines(
                Objects.requireNonNull(executor.execute(prompt, preflightClassifierResult).collectList()                       // Collect all Flux<String> items into List<String>
                .block())
        );
    }


}
