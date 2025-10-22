package iaf.ofek.gisma.ai.enums;

import iaf.ofek.gisma.ai.agent.tools.mcp.McpToolsMetadataDescriber;
import iaf.ofek.gisma.ai.util.StringUtils;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.Arrays;

@AllArgsConstructor
@Getter
public enum ToolManifest {

    RAG_SERVICE("Retrieves and summarizes Gisma API documentation for reasoning or answering."),

    MCP_CLIENT(String.format("Fetches data (entities, aggregations, raw) from gisma api services. Available MCP Tools: %s",
            McpToolsMetadataDescriber.describeAllTools())),

    LLM_REASONER("Calls LLM with query and extra context or data and reason for understanding");

    private final String description;

    public static String describeAll() {
        return StringUtils.joinLines(Arrays.stream(ToolManifest.values())
                .map(m -> m + ": " + m.getDescription())
                .toList());
    }

}
