package iaf.ofek.sigma.ai.service.agent.tools;

import reactor.core.publisher.Flux;

import java.util.Objects;

public interface AgentTool {

    Flux<String> execute(String input);

    default String executeBlocking(String input) {
        return String.join("", Objects.requireNonNull(execute(input).collectList().block()));
    }

}
