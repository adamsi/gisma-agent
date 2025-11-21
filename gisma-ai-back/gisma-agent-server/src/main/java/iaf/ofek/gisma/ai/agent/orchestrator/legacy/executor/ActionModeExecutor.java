package iaf.ofek.gisma.ai.agent.orchestrator.legacy.executor;

import iaf.ofek.gisma.ai.dto.agent.PreflightClassifierResult;
import iaf.ofek.gisma.ai.dto.agent.UserPrompt;
import reactor.core.publisher.Flux;

public interface ActionModeExecutor {

    Flux<String> execute(UserPrompt prompt, PreflightClassifierResult classifierResponse, String chatId);

}
