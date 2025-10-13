package iaf.ofek.sigma.ai.config;

import iaf.ofek.sigma.ai.service.agent.classifier.ToolIntent;
import iaf.ofek.sigma.ai.service.agent.tools.AgentTool;
import iaf.ofek.sigma.ai.service.agent.tools.fallback.OffDomainService;
import iaf.ofek.sigma.ai.service.agent.tools.mcp.SigmaMcpClient;
import iaf.ofek.sigma.ai.service.agent.tools.rag.RagService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Map;

@Configuration
public class AgentToolConfig {

    @Bean
    public Map<ToolIntent, AgentTool> toolMap(RagService ragService,
                                              SigmaMcpClient mcpClient,
                                              OffDomainService offDomainTool) {
        return Map.of(
                ToolIntent.DOC_QUESTION, ragService,
                ToolIntent.DATA_FETCH, mcpClient,
                ToolIntent.OFF_DOMAIN, offDomainTool
        );
    }

}