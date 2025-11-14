package iaf.ofek.gisma.ai.agent.orchestrator;

import iaf.ofek.gisma.ai.dto.agent.UserPromptDTO;
import iaf.ofek.gisma.ai.util.StringUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AgentOrchestrator {

    private final OneShotExecutor oneShotExecutor;

    public Flux<String> handleQuery(UserPromptDTO prompt, UUID userId) {
        return oneShotExecutor.execute(prompt, userId);
    }

    public String handleQueryBlocking(UserPromptDTO prompt, UUID userId) {
        return StringUtils.joinLines(
                Objects.requireNonNull(oneShotExecutor.execute(prompt, userId).collectList()                       // Collect all Flux<String> items into List<String>
                        .block())
        );
    }


}
