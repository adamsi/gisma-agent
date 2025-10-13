package iaf.ofek.sigma.ai.service.agent.classifier;

import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public enum ToolIntent {

    DOC_QUESTION,

    DATA_FETCH,

    OFF_DOMAIN;

    public static ToolIntent fromString(String str) {
        for (ToolIntent intent : ToolIntent.values()) {
            if (intent.name().equalsIgnoreCase(str)) {
                return intent;
            }
        }

        throw new IllegalArgumentException(String.format("Unknown tool intent `%s`", str));
    }

}
