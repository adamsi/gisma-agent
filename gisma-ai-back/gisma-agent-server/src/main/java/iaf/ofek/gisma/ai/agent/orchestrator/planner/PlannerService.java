package iaf.ofek.gisma.ai.agent.orchestrator.planner;

import iaf.ofek.gisma.ai.agent.llmCall.LLMCallerService;
import iaf.ofek.gisma.ai.agent.prompt.PromptFormat;
import iaf.ofek.gisma.ai.dto.agent.PlannerResult;
import iaf.ofek.gisma.ai.dto.agent.PreflightClassifierResult;
import iaf.ofek.gisma.ai.enums.ToolManifest;
import iaf.ofek.gisma.ai.util.ReactiveUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PlannerService {

    private static final String SYSTEM_INSTRUCTIONS = """
            You are the Gisma Planner — a reasoning module that converts a user query, contextual response, 
            and available tools into a structured multi-step execution plan.
            
            Output:
            - A valid JSON matching the PlannerResponse schema.
            
            Rules:
            - Each step must be actionable, ordered, and self-contained.
            - toolCategory options:
              • MCP_CLIENT → structured Gisma MCP service calls.
              • RAG_SERVICE → knowledge/document reasoning.
              • LLM_REASONER → freeform synthesis.
            - If MCP_CLIENT → include 'mcpEndpoints'.
            - Always include 'input' and 'description'; add final 'explanation' for plan logic.
            
            Context:
            ### TOOLS METADATA
            {tools_metadata}
            
            ### USER QUERY
            {user_query}
            
            ### QUICKSHOT RESPONSE
            {quickshot_response}
            
            ### SCHEMA JSON
            {schema_json}
            """;


    private static final String PLANNER_SCHEMA_JSON = """
            {
              "$schema": "http://json-schema.org/draft-07/schema#",
              "title": "PlannerResponse",
              "type": "object",
              "properties": {
                "steps": {
                  "type": "array",
                  "description": "Ordered execution steps required to fulfill the user query",
                  "items": {
                    "type": "object",
                    "properties": {
                      "toolCategory": {
                        "type": "string",
                        "enum": ["MCP_CLIENT", "RAG_SERVICE", "LLM_REASONER"],
                        "description": "Tool type used in this step"
                      },
                      "mcpEndpoints": {
                        "type": "array",
                        "items": { "type": "string" },
                        "description": "List of MCP endpoints if toolCategory = MCP_CLIENT"
                      },
                      "input": {
                        "type": "object",
                        "description": "Parameters or payload required for this step"
                      },
                      "query": {
                        "type": "string",
                        "description": "Prompt for RAG or LLM reasoning steps"
                      },
                      "description": {
                        "type": "string",
                        "description": "Purpose or reasoning behind this step"
                      }
                    },
                    "required": ["toolCategory", "input"]
                  }
                },
                "explanation": {
                  "type": "string",
                  "description": "Overall reasoning and logic behind the generated plan"
                }
              },
              "required": ["steps", "explanation"]
            }
            """;


    private final LLMCallerService llmCallerService;

    public Mono<PlannerResult> plan(String userQuery, PreflightClassifierResult preflightClassifierResult, UUID userId) {
        String systemMessage = SYSTEM_INSTRUCTIONS
                .replace(PromptFormat.TOOLS_METADATA, ToolManifest.describeAll())
                .replace(PromptFormat.QUERY, userQuery)
                .replace(PromptFormat.QUICKSHOT_RESPONSE, preflightClassifierResult.rephrasedResponse())
                .replace(PromptFormat.SCHEMA_JSON, PLANNER_SCHEMA_JSON);

        return ReactiveUtils.runBlockingAsync(() ->
                llmCallerService.callLLMWithSchemaValidation(
                        chatClient -> chatClient.prompt()
                                .system(SYSTEM_INSTRUCTIONS)
                                .system(systemMessage)
                                .user(userQuery),
                        PlannerResult.class, userId
                )
        );
    }
}