package iaf.ofek.gisma.ai.dto.agent;

import iaf.ofek.gisma.ai.enums.ResponseFormat;

public record UserPrompt(String query,
                         String chatId,
                         ResponseFormat responseFormat,
                         String schemaJson)
{}
