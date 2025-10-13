package iaf.ofek.sigma.ai.service.agent.classifier;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class ClassifierService {

    private final ChatClient chatClient;

    public ClassifierService(ChatClient.Builder builder) {
        this.chatClient = builder.build();
    }

    public ToolIntent classify(String userInput) {
        String prompt = """
            Classify the user request into one of the following:
            - %s (documentation, general question on sigma platform, or API usage)
            - %s (ask for sigma data)
            - %s (not related to sigma services at all)
            
            Return only one label.
            User: %s
            """.formatted(ToolIntent.DOC_QUESTION, ToolIntent.DATA_FETCH,
                ToolIntent.OFF_DOMAIN, userInput);

        var response = chatClient.prompt().user(prompt).call().content();
        String firstWord = Optional.ofNullable(response)
                .filter(s -> !s.isBlank())
                .map(s -> s.trim().split("\\s+")[0])
                .orElseThrow(() -> new IllegalArgumentException(
                        String.format("No response from LLM for input `%s`", userInput)
                ));

        return ToolIntent.fromString(firstWord);
    }
}