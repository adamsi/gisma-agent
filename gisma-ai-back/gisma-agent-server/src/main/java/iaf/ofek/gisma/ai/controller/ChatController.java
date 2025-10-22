package iaf.ofek.gisma.ai.controller;

import iaf.ofek.gisma.ai.agent.orchestrator.AgentOrchestrator;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import reactor.core.publisher.Mono;

import java.security.Principal;

@Controller
@RequiredArgsConstructor
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;

    private final AgentOrchestrator agentOrchestrator;

    //client sends request to /app/chat and listens to response on /user/queue/reply,
    // spring handles routing to specific user
    @MessageMapping("/chat")
    public Mono<Void> handlePrompt(@Payload String prompt, Principal user) {
        if (user instanceof Authentication auth) {
            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(auth);
            SecurityContextHolder.setContext(context);
        }

        return agentOrchestrator.handleQuery(prompt)
                .doOnNext(response ->
                        messagingTemplate.convertAndSendToUser(
                                user.getName(), "/queue/reply", response
                        )
                )
                .then();
    }

}
