package iaf.ofek.gisma.ai.controller.agent;

import iaf.ofek.gisma.ai.agent.orchestrator.AgentOrchestrator;
import iaf.ofek.gisma.ai.dto.agent.UserPromptDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/prompt")
@RequiredArgsConstructor
public class AgentRestController {

    private final AgentOrchestrator agentOrchestrator;

    @GetMapping
    public String prompt(@RequestBody UserPromptDTO prompt) {
        return agentOrchestrator.handleQueryBlocking(prompt);
    }

}