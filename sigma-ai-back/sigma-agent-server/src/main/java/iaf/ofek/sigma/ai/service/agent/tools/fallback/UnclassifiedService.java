package iaf.ofek.sigma.ai.service.agent.tools.fallback;

import iaf.ofek.sigma.ai.service.agent.tools.AgentTool;
import org.springframework.stereotype.Service;

@Service
public class UnclassifiedService implements AgentTool {

    @Override
    public String execute(String input) {
        return "Sorry, I couldn’t classify your request.";
    }

}
