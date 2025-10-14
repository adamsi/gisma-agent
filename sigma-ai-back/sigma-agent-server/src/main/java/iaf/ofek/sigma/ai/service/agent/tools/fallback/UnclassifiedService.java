package iaf.ofek.sigma.ai.service.agent.tools.fallback;

import iaf.ofek.sigma.ai.service.agent.tools.AgentTool;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

@Service
public class UnclassifiedService implements AgentTool {

    @Override
    public Flux<String> execute(String input) {
        return Flux.just( "Sorry, I couldn’t classify your request.");
    }

}
