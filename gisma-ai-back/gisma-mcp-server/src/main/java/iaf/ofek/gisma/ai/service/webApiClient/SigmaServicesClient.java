package iaf.ofek.gisma.ai.service.webApiClient;

import iaf.ofek.gisma.ai.demo.Fruit;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;


import java.util.List;

@Service
public class GismaServicesClient {

    private final WebClient webClient = WebClient.create("http://localhost:8081");

    public List<Fruit> getAllFruits() {
        return List.of(
                new Fruit(1L, "fruit-russia-1"),
                new Fruit(2L, "fruit-germany-2"),
                new Fruit(3L, "fruit-spain-3"),
                new Fruit(4L, "fruit-egypt-4")
        );
//        return webClient.get()
//                .uri("/fruits")
//                .retrieve()
//                .bodyToFlux(Fruit.class)
//                .collectList()
//                .block();
    }

}
