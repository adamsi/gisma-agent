package iaf.ofek.sigma.ai.controller;

import iaf.ofek.sigma.ai.service.agent.AgentService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

@RestController("/agent")
@RequiredArgsConstructor
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;

    private final AgentService agentService;

    //client sends request to /app/chat and listens to response on /user/`bob`/queue/reply
    @MessageMapping("/chat")
    public void handlePrompt(@Payload String prompt, Principal user) {
        String response = agentService.handleQuery(prompt);
        messagingTemplate.convertAndSendToUser(user.getName(), "/queue/reply", response);
    }

}
