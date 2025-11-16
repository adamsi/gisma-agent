package iaf.ofek.gisma.ai.enums;

import iaf.ofek.gisma.ai.agent.prompt.PromptFormat;
import lombok.AllArgsConstructor;
import lombok.Getter;

@AllArgsConstructor
@Getter
public enum ResponseFormat {

    SIMPLE {
        @Override
        public String getFormat(String schema) {
            return """
            Respond in a friendly, well-structured style:
            - For specific queries: provide concise, factual answers.
            - For broad or open-ended queries: include a short overview with markdown sections (Overview, Example, Tip).
            - Use clear formatting and naturally include emojis to enhance readability.
            """;
        }
    },

    JSON {
        @Override
        public String getFormat(String schema) {
            return  """
                    Only return valid JSON, nothing else.
                    Do not prepend 'JSON:' or any extra text.
                    """;
        }
    },

    SCHEMA {
        @Override
        public String getFormat(String schema) {
            return  """
                    Response should match the next JSON Schema: {schema_json}
                    """
                    .replace(PromptFormat.SCHEMA_JSON, schema);
        }
    };

    public abstract String getFormat(String schema);

}
