package iaf.ofek.sigma.ai.service.agent.orchestrator;

import iaf.ofek.sigma.ai.service.agent.orchestrator.classifier.ClassifierService;
import iaf.ofek.sigma.ai.service.agent.orchestrator.classifier.ToolIntent;
import iaf.ofek.sigma.ai.service.agent.tools.AgentTool;
import iaf.ofek.sigma.ai.service.agent.tools.fallback.UnclassifiedService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class AgentOrchestrator {

    private final ClassifierService classifierService;

    private final UnclassifiedService unclassifiedService;

    private final Map<ToolIntent, AgentTool> toolMap;

    public Flux<String> handleQuery(String input) {
        var intent = classifierService.classify(input);
        Flux<String> response = toolMap.getOrDefault(intent, unclassifiedService)
                .execute(input);

        return response;
    }

    public String handleQueryBlocking(String input) {
        var intent = classifierService.classify(input);
        String response = toolMap.getOrDefault(intent, unclassifiedService)
                .executeBlocking(input);

        return response;
    }



}
