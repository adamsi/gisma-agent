package iaf.ofek.sigma.ai.service.webApiClient;

import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;


import java.util.List;

@Service
public class SigmaServicesClient {

    private final WebClient webClient = WebClient.create("http://localhost:9040");


    public List<String> getAllTargets() {
        return webClient.get()
                .uri("/targets")
                .retrieve()
                .bodyToFlux(String.class)
                .collectList()
                .block();
    }

}
