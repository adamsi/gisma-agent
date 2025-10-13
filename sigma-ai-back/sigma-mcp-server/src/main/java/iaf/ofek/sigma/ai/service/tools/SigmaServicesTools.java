package iaf.ofek.sigma.ai.service.tools;

import iaf.ofek.sigma.ai.demo.Target;
import iaf.ofek.sigma.ai.service.webApiClient.SigmaServicesClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Log4j2
public class SigmaServicesTools {

    private final SigmaServicesClient sigmaServicesClient;

    @Tool(description = "Get all targets")
    public List<Target> getAllTargets() {
        log.info("getAllTargets called !!!");

        return sigmaServicesClient.getAllTargets();
    }

}
