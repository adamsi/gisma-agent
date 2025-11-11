package iaf.ofek.gisma.ai.controller.agent;

import iaf.ofek.gisma.ai.agent.orchestrator.AgentOrchestrator;
import iaf.ofek.gisma.ai.dto.agent.UserPromptDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.UUID;

@RestController
@RequestMapping("/prompt")
@RequiredArgsConstructor
public class AgentRestController {

    private final AgentOrchestrator agentOrchestrator;

    @GetMapping
    public String prompt(@RequestBody UserPromptDTO prompt, Principal user) {
        Authentication auth = (Authentication) user;

        return agentOrchestrator.handleQueryBlocking(prompt, (UUID) auth.getPrincipal());
    }

}