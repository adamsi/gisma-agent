package iaf.ofek.sigma.ai;

import iaf.ofek.sigma.ai.service.tools.SigmaServicesTools;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.ai.tool.method.MethodToolCallbackProvider;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableAsync;

@EnableAsync
@SpringBootApplication
public class SigmaMcpServer {

    public static void main(String[] args) {
        SpringApplication.run(SigmaMcpServer.class, args);
    }


    @Bean
    public ToolCallbackProvider tools(SigmaServicesTools sigmaServicesTools) {
        return MethodToolCallbackProvider.builder()
                .toolObjects(sigmaServicesTools)
                .build();
    }

}
