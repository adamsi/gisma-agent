package iaf.ofek.sigma.ai.config;

import iaf.ofek.sigma.ai.agent.orchestrator.reasoner.LLMReasoner;
import iaf.ofek.sigma.ai.agent.orchestrator.executor.StepExecutor;
import iaf.ofek.sigma.ai.enums.ToolManifest;
import iaf.ofek.sigma.ai.agent.orchestrator.executor.DirectToolExecutor;
import iaf.ofek.sigma.ai.agent.tools.mcp.SigmaMcpClient;
import iaf.ofek.sigma.ai.agent.tools.rag.RagService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Map;

@Configuration
public class AgentConfig {

    @Bean
    public Map<ToolManifest, DirectToolExecutor> directToolMap(RagService ragService, SigmaMcpClient mcpClient) {
        return Map.of(
                ToolManifest.RAG_SERVICE, ragService,
                ToolManifest.MCP_CLIENT, mcpClient
        );
    }

    @Bean
    public Map<ToolManifest, StepExecutor> planStepExecutorMap(RagService ragService, SigmaMcpClient mcpClient,
                                                               LLMReasoner llmReasoner) {
        return Map.of(
                ToolManifest.RAG_SERVICE, ragService,
                ToolManifest.MCP_CLIENT, mcpClient,
                ToolManifest.LLM_REASONER, llmReasoner
        );
    }

}