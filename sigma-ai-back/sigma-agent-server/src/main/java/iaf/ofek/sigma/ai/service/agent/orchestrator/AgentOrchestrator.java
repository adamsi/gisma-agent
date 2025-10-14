package iaf.ofek.sigma.ai.service.agent.orchestrator;

import iaf.ofek.sigma.ai.service.agent.classifier.ClassifierService;
import iaf.ofek.sigma.ai.service.agent.classifier.ToolIntent;
import iaf.ofek.sigma.ai.service.agent.tools.AgentTool;
import iaf.ofek.sigma.ai.service.agent.tools.fallback.UnclassifiedService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class AgentOrchestrator {

    private final ClassifierService classifierService;

    private final UnclassifiedService unclassifiedService;

    private final Map<ToolIntent, AgentTool> toolMap;

    public String handleQuery(String input) {
        var intent = classifierService.classify(input);
        String response = toolMap.getOrDefault(intent, unclassifiedService)
                .execute(input);

        return response;
    }



}
