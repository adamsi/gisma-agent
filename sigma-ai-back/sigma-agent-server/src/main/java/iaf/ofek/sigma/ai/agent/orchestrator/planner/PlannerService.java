package iaf.ofek.sigma.ai.agent.orchestrator.planner;

import iaf.ofek.sigma.ai.agent.llmCaller.LLMCallerService;
import iaf.ofek.sigma.ai.agent.prompt.PromptFormat;
import iaf.ofek.sigma.ai.dto.agent.PlannerResponse;
import iaf.ofek.sigma.ai.dto.agent.PreflightClassifierResponse;
import iaf.ofek.sigma.ai.enums.ToolManifest;
import iaf.ofek.sigma.ai.util.ReactiveUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

@Service
@RequiredArgsConstructor
public class PlannerService {

    private static final String SYSTEM_INSTRUCTIONS = """
            You are the Sigma Planner for the Sigma AI system.
            
            Your job is to convert a user query and QuickShotResponse
            into a structured execution plan consisting of ordered steps.
            
            Guidelines:
            - Each step must be actionable and self-contained.
            - Decide whether each step uses a general tool category:
              MCP_CLIENT or RAG_SERVICE.
            - If MCP_CLIENT, list all relevant endpoints in 'mcpEndpoints'.
            - Provide input parameters for each step.
            - Include 'query' if the step requires a RAG/LLM call.
            - Include 'description' for reasoning or audit purposes.
            - Return only valid JSON matching the PlannerResponse schema.
            """;

    private static final String PLANNER_SYSTEM_PROMPT = """
            Available Tools:
            {tools_metadata}
            
            User Query:
            {user_query}
            
            QuickShotResponse:
            {quickshot_response}
            
            Guidelines:
            - Return a JSON object matching this schema:
            {schema_json}
            - Each step must include:
              - toolCategory: MCP_CLIENT | RAG_SERVICE
              - mcpEndpoints: list of endpoint names if MCP_CLIENT
              - input: parameters as key-value pairs
              - query: prompt for LLM if RAG_SERVICE
              - description: optional reasoning for step
            - Plan should fully address the user query using available tools.
            """;

    private static final String PLANNER_SCHEMA_JSON = """
            {
              "$schema": "http://json-schema.org/draft-07/schema#",
              "title": "PlannerResponse",
              "type": "object",
              "properties": {
                "steps": {
                  "type": "array",
                  "description": "Ordered execution steps",
                  "items": {
                    "type": "object",
                    "properties": {
                      "toolCategory": {
                        "type": "string",
                        "enum": ["MCP_CLIENT", "RAG_SERVICE"],
                        "description": "General tool category for this step"
                      },
                      "mcpEndpoints": {
                        "type": "array",
                        "description": "List of MCP endpoints to call if toolCategory is MCP_CLIENT",
                        "items": { "type": "string" }
                      },
                      "input": {
                        "type": "object",
                        "description": "Parameters for the step"
                      },
                      "query": {
                        "type": "string",
                        "description": "LLM prompt if step uses RAG_SERVICE"
                      },
                      "description": {
                        "type": "string",
                        "description": "Reasoning or explanation for this step"
                      }
                    },
                    "required": ["toolCategory", "input"]
                  }
                },
                "explanation": {
                  "type": "string",
                  "description": "Overall reasoning for the entire plan"
                }
              },
              "required": ["steps", "explanation"]
            }
            """;

    private final LLMCallerService llmCallerService;

    public Mono<PlannerResponse> plan(String userQuery, PreflightClassifierResponse preflightClassifierResponse) {
        String systemMessage = PLANNER_SYSTEM_PROMPT
                .replace(PromptFormat.TOOLS_METADATA, ToolManifest.describeAll())
                .replace(PromptFormat.QUERY, userQuery)
                .replace(PromptFormat.QUICKSHOT_RESPONSE, preflightClassifierResponse.rephrasedResponse())
                .replace(PromptFormat.SCHEMA_JSON, PLANNER_SCHEMA_JSON);

        return ReactiveUtils.runBlockingAsync(() ->
                llmCallerService.callLLMWithSchemaValidation(
                        chatClient -> chatClient.prompt()
                                .system(systemMessage)
                                .user(userQuery),
                        PlannerResponse.class
                )
        );
    }
}