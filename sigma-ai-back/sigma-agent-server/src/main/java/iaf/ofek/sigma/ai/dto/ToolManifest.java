package iaf.ofek.sigma.ai.dto;

import lombok.Builder;

@Builder
public record ToolManifest(
        String name,
        String description
) {}
