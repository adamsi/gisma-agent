package iaf.ofek.gisma.ai.agent.orchestrator.executor;

import iaf.ofek.gisma.ai.dto.agent.PreflightClassifierResult;
import iaf.ofek.gisma.ai.dto.agent.UserPromptDTO;
import reactor.core.publisher.Flux;

public interface ActionModeExecutor {

    Flux<String> execute(UserPromptDTO prompt, PreflightClassifierResult classifierResponse);

}
