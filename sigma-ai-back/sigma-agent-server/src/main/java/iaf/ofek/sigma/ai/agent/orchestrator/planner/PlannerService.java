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
            You are the Sigma Planner — a reasoning module that converts a user query and contextual responses 
            into a structured, multi-step execution plan.
            
            Input:
            - User Query
            - QuickShotResponse → short RAG-based pre-answer
            - Available Tools Metadata
            
            Output:
            - A valid JSON object that strictly matches the PlannerResponse schema.
            
            Guidelines:
            - Each step must be actionable, self-contained, and logically ordered.
            - Choose the toolCategory carefully:
                • MCP_CLIENT → structured Sigma MCP service calls.
                • RAG_SERVICE → knowledge or documentation-based reasoning.
                • LLM_CALL → general-purpose freeform LLM reasoning or synthesis.
            - If MCP_CLIENT → specify 'mcpEndpoints' (relevant endpoints).
            - Always include 'input' parameters.
            - If RAG_SERVICE or LLM_CALL → include 'query' (prompt text).
            - Include 'description' explaining the purpose of each step.
            - Add a final 'explanation' summarizing the overall plan logic.
            
            Context:
            🧩 Tools Metadata:
            {tools_metadata}
            
            🧠 User Query:
            {user_query}
            
            💬 QuickShot Response (from RAG quick answer phase):
            {quickshot_response}
            
            Schema to follow:
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
                        "enum": ["MCP_CLIENT", "RAG_SERVICE", "LLM_CALL"],
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

    public Mono<PlannerResponse> plan(String userQuery, PreflightClassifierResponse preflightClassifierResponse) {
        String systemMessage = SYSTEM_INSTRUCTIONS
                .replace(PromptFormat.TOOLS_METADATA, ToolManifest.describeAll())
                .replace(PromptFormat.QUERY, userQuery)
                .replace(PromptFormat.QUICKSHOT_RESPONSE, preflightClassifierResponse.rephrasedResponse())
                .replace(PromptFormat.SCHEMA_JSON, PLANNER_SCHEMA_JSON);

        return ReactiveUtils.runBlockingAsync(() ->
                llmCallerService.callLLMWithSchemaValidation(
                        chatClient -> chatClient.prompt()
                                .system(SYSTEM_INSTRUCTIONS)
                                .system(systemMessage)
                                .user(userQuery),
                        PlannerResponse.class
                )
        );
    }
}