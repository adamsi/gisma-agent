package iaf.ofek.sigma.ai.controller;

import iaf.ofek.sigma.ai.agent.orchestrator.AgentOrchestrator;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/test")
@RequiredArgsConstructor
public class ChatTestController {

    private final AgentOrchestrator agentOrchestrator;

    @GetMapping
    public String prompt(@RequestBody String query) {
        return agentOrchestrator.handleQueryBlocking(query);
    }

}