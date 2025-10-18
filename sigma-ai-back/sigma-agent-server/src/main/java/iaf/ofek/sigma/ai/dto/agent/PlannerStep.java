package iaf.ofek.sigma.ai.dto.agent;

import iaf.ofek.sigma.ai.enums.ToolManifest;

import java.util.List;
import java.util.Map;

public record PlannerStep(
        ToolManifest toolCategory,
        List<String> mcpEndpoints,
        Map<String, Object> input,
        String query
) {}
