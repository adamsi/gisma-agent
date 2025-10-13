package iaf.ofek.sigma.ai.demo;

import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController("/targets")
public class DemoController {

    private static final List<Target> TARGETS = List.of(
            new Target(1L, "idfcode-russia-1"),
            new Target(2L, "idfcode-germany-2"),
            new Target(3L, "idfcode-spain-3"),
            new Target(4L, "idfcode-egypt-4")
    );

    public List<Target> getAllTargets() {
        return TARGETS;
    }

}
