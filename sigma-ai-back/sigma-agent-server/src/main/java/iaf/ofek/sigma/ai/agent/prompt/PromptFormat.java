package iaf.ofek.sigma.ai.agent.prompt;

import lombok.AllArgsConstructor;
import lombok.Getter;

@AllArgsConstructor
@Getter
public class PromptFormat {

    public static final String SCHEMA_JSON = "{schema_json}";

    public static final String TOOLS_METADATA = "{tools_metadata}";

    public static final String QUICKSHOT_RESPONSE = "{quickshot_response}";

    public static final String QUERY = "{query}";

    public static final String MCP_ENDPOINTS = "{mcp_endpoints}";

    public static final String MCP_INPUT = "{mcp_input}";

    public static final String STEP_DESCRIPTION = "{step_description}";

    public static final String PLAN_OVERALL_SUCCESS = "{plan_overall_success}";

    public static final String PLAN_AGGREGATED_OUTPUT = "{plan_aggregated_output}";

}
