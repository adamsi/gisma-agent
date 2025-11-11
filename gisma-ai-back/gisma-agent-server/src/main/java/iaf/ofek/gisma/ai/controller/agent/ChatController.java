package iaf.ofek.gisma.ai.controller.agent;

import iaf.ofek.gisma.ai.agent.orchestrator.AgentOrchestrator;
import iaf.ofek.gisma.ai.dto.agent.UserPromptDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import reactor.core.publisher.Mono;

import java.security.Principal;
import java.util.UUID;

@Controller
@RequiredArgsConstructor
@Log4j2
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;

    private final AgentOrchestrator agentOrchestrator;

    //client sends request to /app/chat and listens to response on /user/queue/reply,
    // spring handles routing to specific user
    @MessageMapping("/chat")
    public Mono<Void> handlePrompt(@Payload UserPromptDTO prompt, Principal user) {
        log.info("Received prompt: {}.", prompt);
        Authentication auth = (Authentication) user;

        return agentOrchestrator.handleQuery(prompt, (UUID) auth.getPrincipal())
                .concatMap(response ->
                        Mono.fromRunnable(() ->
                                messagingTemplate.convertAndSendToUser(
                                        auth.getName(),
                                        "/queue/reply",
                                        response
                                )
                        )
                )
                .then();
    }


}
