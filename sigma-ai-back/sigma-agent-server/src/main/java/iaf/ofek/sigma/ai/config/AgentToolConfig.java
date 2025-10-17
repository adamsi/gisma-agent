package iaf.ofek.sigma.ai.config;

import iaf.ofek.sigma.ai.enums.ToolManifest;
import iaf.ofek.sigma.ai.agent.orchestrator.executor.DirectToolExecutor;
import iaf.ofek.sigma.ai.agent.tools.mcp.SigmaMcpClient;
import iaf.ofek.sigma.ai.agent.tools.rag.RagService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Map;

@Configuration
public class AgentToolConfig {

    @Bean
    public Map<ToolManifest, DirectToolExecutor> directToolMap(RagService ragService, SigmaMcpClient mcpClient) {
        return Map.of(
                ToolManifest.RAG_SERVICE, ragService,
                ToolManifest.MCP_CLIENT, mcpClient);
    }

}