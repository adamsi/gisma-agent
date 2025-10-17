package iaf.ofek.sigma.ai.service.agent.orchestrator;

import iaf.ofek.sigma.ai.dto.agent.PreflightClassifierResponse;
import iaf.ofek.sigma.ai.dto.agent.QuickShotResponse;
import iaf.ofek.sigma.ai.service.agent.orchestrator.classifier.PreflightClassifierService;
import iaf.ofek.sigma.ai.service.agent.tools.ToolRegistry;
import iaf.ofek.sigma.ai.service.agent.tools.rag.RagService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

@Service
@RequiredArgsConstructor
public class AgentOrchestrator {

    private final RagService ragService;

    private final PreflightClassifierService preflightClassifierService;

    private final ToolRegistry toolRegistry;

    public Flux<String> handleQuery(String query) {
        QuickShotResponse quickShotResponse = ragService.quickShotSimilaritySearch(query);
        PreflightClassifierResponse preflightClassifierResponse =  preflightClassifierService.classify(query, quickShotResponse, toolRegistry.describeAll());

    }

    public String handleQueryBlocking(String input) {

    }



}
