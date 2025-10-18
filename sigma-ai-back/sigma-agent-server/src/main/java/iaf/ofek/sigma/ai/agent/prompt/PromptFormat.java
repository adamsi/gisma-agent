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

}
