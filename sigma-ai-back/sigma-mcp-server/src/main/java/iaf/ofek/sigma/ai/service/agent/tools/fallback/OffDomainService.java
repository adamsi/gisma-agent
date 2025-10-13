package iaf.ofek.sigma.ai.service.agent.tools.fallback;

import iaf.ofek.sigma.ai.service.agent.tools.AgentTool;
import org.springframework.stereotype.Service;

@Service
public class OffDomainService implements AgentTool {

    @Override
    public String execute(String input) {
        return "Sorry, this question is outside the Sigma System scope.";

    }

}
