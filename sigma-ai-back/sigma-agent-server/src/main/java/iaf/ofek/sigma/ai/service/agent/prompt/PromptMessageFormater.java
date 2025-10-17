package iaf.ofek.sigma.ai.service.agent.prompt;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

@AllArgsConstructor
@Getter
public enum PromptMessageFormater {

    SCHEMA_JSON("{schema_json}"),

    TOOLS_METADATA("{tools_metadata}"),

    QUICKSHOT_RESPONSE("{quickshot_response}");

    private final String placeholder;

    public String format(String prompt, String replacement) {
        return prompt.replace(this.getPlaceholder(), replacement);
    }

    public static String formatMultiple(String prompt, String[] replacements, PromptMessageFormater... formatters) {
        if (replacements.length != formatters.length) {
            throw new IllegalArgumentException("Replacements and formatters must have the same length");
        }

        String result = prompt;

        for (int index = 0; index < formatters.length; index++) {
            result = formatters[index].format(result, replacements[index]);
        }

        return result;
    }

}
