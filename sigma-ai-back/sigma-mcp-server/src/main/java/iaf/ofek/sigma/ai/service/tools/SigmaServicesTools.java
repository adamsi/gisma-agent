package iaf.ofek.sigma.ai.service.tools;

import iaf.ofek.sigma.ai.service.webApiClient.SigmaServicesClient;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SigmaServicesTools {

    private final SigmaServicesClient sigmaServicesClient;

    @Tool(description = "Get all targets")
    public List<String> getAllTargets() {
        return sigmaServicesClient.getAllTargets();
    }

}
