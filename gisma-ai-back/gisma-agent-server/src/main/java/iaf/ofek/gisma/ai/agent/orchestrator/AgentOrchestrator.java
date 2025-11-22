package iaf.ofek.gisma.ai.agent.orchestrator;

import iaf.ofek.gisma.ai.dto.agent.UserPrompt;
import iaf.ofek.gisma.ai.util.StringUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.util.Objects;

@Service
@RequiredArgsConstructor
public class AgentOrchestrator {

    private final OneShotExecutor oneShotExecutor;

    public Flux<String> handleQuery(UserPrompt prompt, String chatId) {
        return oneShotExecutor.execute(prompt, chatId);
    }

    public String handleQueryBlocking(UserPrompt prompt, String chatId) {
        return oneShotExecutor.executeMono(prompt, chatId).block();
    }


}
