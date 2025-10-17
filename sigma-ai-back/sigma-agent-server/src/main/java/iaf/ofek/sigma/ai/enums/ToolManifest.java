package iaf.ofek.sigma.ai.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.Arrays;
import java.util.stream.Collectors;

@AllArgsConstructor
@Getter
public enum ToolManifest {

    RAG_SERVICE("Retrieves and summarizes Sigma API documentation for reasoning or answering."),

    MCP_CLIENT("Fetches data (entities, aggregations, raw) from sigma api services");

    private final String description;

    public static String describeAll() {
        return Arrays.stream(ToolManifest.values())
                .map(m -> m + ": " + m.getDescription())
                .collect(Collectors.joining("\n"));
    }

}
