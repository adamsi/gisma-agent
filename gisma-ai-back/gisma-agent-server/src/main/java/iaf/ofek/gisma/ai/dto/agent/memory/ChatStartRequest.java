package iaf.ofek.gisma.ai.dto.agent.memory;

import iaf.ofek.gisma.ai.enums.ResponseFormat;

public record ChatStartRequest(String query,
                               ResponseFormat responseFormat,
                               String schemaJson) {
}
