package iaf.ofek.gisma.ai.enums;

import iaf.ofek.gisma.ai.agent.prompt.PromptFormat;
import iaf.ofek.gisma.ai.dto.agent.UserPromptDTO;
import lombok.AllArgsConstructor;
import lombok.Getter;

@AllArgsConstructor
@Getter
public enum ResponseFormat {

    SIMPLE {
        @Override
        public String getFormat(String schema) {
                return  """
                    Friendly, well-structured, using markdown sections (Overview, Steps, Example, Tip),
                    clear formatting, and concise explanations. Include emojis in your responses naturally to enhance readability.
                    """;
        }
    },

    JSON {
        @Override
        public String getFormat(String schema) {
            return  """
                   Response should be a JSON
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

    public static String getFormat(UserPromptDTO prompt) {
        return prompt.responseFormat().getFormat(prompt.schemaJson());
    }

}
