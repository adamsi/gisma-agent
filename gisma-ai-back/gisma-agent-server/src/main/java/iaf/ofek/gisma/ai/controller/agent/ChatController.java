package iaf.ofek.gisma.ai.controller.agent;

import iaf.ofek.gisma.ai.agent.orchestrator.AgentOrchestrator;
import iaf.ofek.gisma.ai.dto.agent.memory.ChatStartRequest;
import iaf.ofek.gisma.ai.dto.agent.UserPrompt;
import iaf.ofek.gisma.ai.dto.agent.memory.ChatStartResponse;
import iaf.ofek.gisma.ai.service.memory.ChatMemoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.security.Principal;
import java.util.UUID;

@Controller
@RequiredArgsConstructor
@Log4j2
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;

    private final AgentOrchestrator agentOrchestrator;

    private final ChatMemoryService chatMemoryService;

    //client sends request to /app/chat and listens to response on /user/queue/reply,
    // spring handles routing to specific user
    @MessageMapping("/chat")
    public Mono<Void> handlePrompt(@Payload UserPrompt prompt, Principal user) {
        log.info("Received prompt: {}.", prompt);
        String chatId = prompt.chatId();
        String userId = user.getName();

        return agentOrchestrator.handleQuery(prompt, chatId)
                .doOnNext(response ->
                        messagingTemplate.convertAndSendToUser(
                                userId,
                                "/queue/chat." + chatId,
                                response
                        )
                )
                .then();
    }

    @MessageMapping("/chat/start")
    public Mono<Void> handleChatStartPrompt(@Payload ChatStartRequest chatStart, Principal user) {
        String userId = user.getName();

        return chatMemoryService.createChat(chatStart, UUID.fromString(userId))
                .flatMapMany(chatStartResponse -> {
                    String chatId = chatStartResponse.chatId();
                    Mono<Void> metadata = Mono.fromRunnable(() ->
                            messagingTemplate.convertAndSendToUser(userId, "/queue/metadata", chatStartResponse)
                    );
                    Flux<Void> responses = agentOrchestrator.handleQuery(
                                    new UserPrompt(chatStart.query(), chatId, chatStart.responseFormat(), chatStart.schemaJson()),
                                    chatId
                            )
                            .concatMap(response -> Mono.fromRunnable(() ->
                                    messagingTemplate.convertAndSendToUser(userId, "/queue/chat." + chatId, response)
                            ));

                    return metadata.thenMany(responses);
                })
                .then();
    }

}
