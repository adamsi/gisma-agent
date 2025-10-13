package iaf.ofek.sigma.ai.service.webApiClient;

import iaf.ofek.sigma.ai.demo.Target;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;


import java.util.List;

@Service
public class SigmaServicesClient {

    private final WebClient webClient = WebClient.create("http://localhost:8081");

    public List<Target> getAllTargets() {
        return List.of(
                new Target(1L, "idfcode-russia-1"),
                new Target(2L, "idfcode-germany-2"),
                new Target(3L, "idfcode-spain-3"),
                new Target(4L, "idfcode-egypt-4")
        );
//        return webClient.get()
//                .uri("/targets")
//                .retrieve()
//                .bodyToFlux(Target.class)
//                .collectList()
//                .block();
    }

}
