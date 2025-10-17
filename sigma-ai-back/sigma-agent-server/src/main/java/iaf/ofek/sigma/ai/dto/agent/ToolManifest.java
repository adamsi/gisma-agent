package iaf.ofek.sigma.ai.dto.agent;

import lombok.Builder;

@Builder
public record ToolManifest(
        String name,
        String description
) {}
