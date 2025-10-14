package iaf.ofek.sigma.ai.service.agent.tools;

import iaf.ofek.sigma.ai.dto.ToolManifest;
import iaf.ofek.sigma.ai.service.agent.classifier.ToolIntent;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class ToolRegistry {

    private final Map<ToolIntent, AgentTool> tools;

    private List<ToolManifest> manifests() {
        return tools.values().stream()
                .map(AgentTool::manifest)
                .toList();
    }

    public String describeAll() {
        return manifests().stream()
                .map(m -> m.name() + ": " + m.description())
                .collect(Collectors.joining("\n"));
    }

}
