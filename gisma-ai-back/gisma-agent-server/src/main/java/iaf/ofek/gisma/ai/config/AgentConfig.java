package iaf.ofek.gisma.ai.config;

import iaf.ofek.gisma.ai.agent.orchestrator.reasoner.LLMReasoner;
import iaf.ofek.gisma.ai.agent.orchestrator.executor.StepExecutor;
import iaf.ofek.gisma.ai.enums.ToolManifest;
import iaf.ofek.gisma.ai.agent.orchestrator.executor.DirectToolExecutor;
import iaf.ofek.gisma.ai.agent.tools.mcp.GismaMcpClient;
import iaf.ofek.gisma.ai.agent.tools.rag.RagService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Map;

@Configuration
public class AgentConfig {

    @Bean
    public Map<ToolManifest, DirectToolExecutor> directToolMap(RagService ragService, GismaMcpClient mcpClient) {
        return Map.of(
                ToolManifest.RAG_SERVICE, ragService,
                ToolManifest.MCP_CLIENT, mcpClient
        );
    }

    @Bean
    public Map<ToolManifest, StepExecutor> planStepExecutorMap(RagService ragService, GismaMcpClient mcpClient,
                                                               LLMReasoner llmReasoner) {
        return Map.of(
                ToolManifest.RAG_SERVICE, ragService,
                ToolManifest.MCP_CLIENT, mcpClient,
                ToolManifest.LLM_REASONER, llmReasoner
        );
    }

}