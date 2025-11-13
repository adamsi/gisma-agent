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
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AgentOrchestrator {

    private final RagService ragService;

    private final PreflightClassifierService preflightClassifierService;

    private final ActionModeExecutorRouter actionModeExecutorRouter;

    private final OneShotExecutor oneShotExecutor;

//    public Flux<String> handleQuery(UserPromptDTO prompt, UUID userId) {
//        return ragService.quickShotSimilaritySearch(prompt.query(), userId)
//                .flatMap(quickShotResponse -> preflightClassifierService.classify(prompt.query(), quickShotResponse, userId))
//                .flatMapMany(preflightClassifierResponse -> {
//                    if (preflightClassifierResponse.sufficient()) {
//                        return Flux.just(preflightClassifierResponse.rephrasedResponse());
//                    }
//
//                    ActionModeExecutor executor = actionModeExecutorRouter.route(preflightClassifierResponse);
//
//                    return executor.execute(prompt, preflightClassifierResponse, userId);
//                });
//    }

    public Flux<String> handleQuery(UserPromptDTO prompt, UUID userId) {
        return oneShotExecutor.execute(prompt, userId);
    }

    public String handleQueryBlocking(UserPromptDTO prompt, UUID userId) {
        QuickShotResponse quickShotResponse = ragService.quickShotSimilaritySearch(prompt.query(), userId).block();

        if (quickShotResponse == null) {
            throw new IllegalArgumentException("quickShotResponse must not be null");
        }

        PreflightClassifierResult preflightClassifierResult =  preflightClassifierService.classify(prompt.query(), quickShotResponse, userId).block();

        if (preflightClassifierResult == null) {
            throw new IllegalArgumentException("quickShotResponse must not be null");
        }

        if (preflightClassifierResult.sufficient()) {
            return preflightClassifierResult.rephrasedResponse();
        }

        ActionModeExecutor executor = actionModeExecutorRouter.route(preflightClassifierResult);

        return StringUtils.joinLines(
                Objects.requireNonNull(executor.execute(prompt, preflightClassifierResult, userId).collectList()                       // Collect all Flux<String> items into List<String>
                .block())
        );
    }


}
