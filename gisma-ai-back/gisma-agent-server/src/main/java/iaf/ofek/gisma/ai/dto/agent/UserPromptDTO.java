package iaf.ofek.gisma.ai.dto.agent;

import iaf.ofek.gisma.ai.enums.ResponseFormat;

public record UserPromptDTO(String query,
                            ResponseFormat responseFormat,
                            String schemaJson)
{}
