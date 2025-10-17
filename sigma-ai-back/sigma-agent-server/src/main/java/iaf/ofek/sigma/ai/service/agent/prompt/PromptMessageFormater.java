package iaf.ofek.sigma.ai.service.agent.prompt;

import lombok.AllArgsConstructor;
import lombok.Getter;

@AllArgsConstructor
@Getter
public enum PromptMessageFormater {

    SCHEMA_JSON("{schema_json_format}") {
        @Override
        public String format(String prompt, String schema) {
            return prompt.replace(this.getPlaceholder(), schema);
        }
    };

    private final String placeholder;

    public abstract String format(String prompt, String schema);

}
