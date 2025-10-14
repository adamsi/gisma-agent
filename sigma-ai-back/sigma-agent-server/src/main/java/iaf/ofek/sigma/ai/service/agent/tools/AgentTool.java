package iaf.ofek.sigma.ai.service.agent.tools;

import iaf.ofek.sigma.ai.dto.ToolManifest;

import java.util.Optional;

public interface AgentTool {

    String execute(String input);

    /**
     * Return a description of what the tool does,
     * its capabilities, input schema, and possible use cases.
     * Used by orchestrator or classifier for reasoning.
     */
    default ToolManifest manifest() {
        return ToolManifest.builder()
                .name(this.getClass().getSimpleName())
                .description("No description provided.")
                .build();
    }

    /**
      let the tool participate in pre-orchestration reasoning.
     */
    default Optional<String> contextualize(String query) {
        return Optional.empty();
    }

}
