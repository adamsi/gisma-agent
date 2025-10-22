package iaf.ofek.gisma.ai.dto.agent;

import iaf.ofek.gisma.ai.enums.ToolManifest;

import java.util.List;
import java.util.Map;

public record PlannerStep(
        ToolManifest toolCategory,
        List<String> mcpEndpoints,
        Map<String, Object> input,
        String query,
        String description
) {}
