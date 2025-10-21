package iaf.ofek.sigma.ai.agent.orchestrator.classifier;

import iaf.ofek.sigma.ai.agent.llmCall.LLMCallerService;
import iaf.ofek.sigma.ai.agent.prompt.PromptFormat;
import iaf.ofek.sigma.ai.dto.agent.PreflightClassifierResult;
import iaf.ofek.sigma.ai.dto.agent.QuickShotResponse;
import iaf.ofek.sigma.ai.enums.ToolManifest;
import iaf.ofek.sigma.ai.util.ReactiveUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;


@Service
@RequiredArgsConstructor
public class PreflightClassifierService {

    private static final String PREFLIGHT_CLASSIFIER_SYSTEM_MESSAGE = """
            You are the Preflight Classifier for Sigma AI.
            
            Inputs:
            1. User query.
            2. QuickShotResponse (responseText, confidenceScore, requiresDataFetching, requiresPlanning).
            3. Available tools: {tools_metadata}.
            
            Tasks:
            - Set `sufficient` true if QuickShotResponse fully answers query.
            - If false, choose `actionMode`: "DIRECT_TOOL" or "PLANNER".
            - Always include `rephrasedResponse`: correct grammar and structure.
              - When sufficient=false, remove disclaimers or filler text, keep only factual content.
            - Output valid JSON per {schema_json}.
            """;


    private static final String PREFLIGHT_CLASSIFIER_USER_MESSAGE = """
                ### USER QUERY:
                {query}
            
                ### QUICKSHOT RESPONSE:
                {quickshot_response}
            """;


    private static final String PREFLIGHT_CLASSIFIER_SCHEMA = """
            {
              "$schema": "http://json-schema.org/draft-07/schema#",
              "title": "ClassifierResponse",
              "type": "object",
              "properties": {
                "sufficient": {
                  "type": "boolean",
                  "description": "True if the QuickShotResponse fully answers the query."
                },
                "actionMode": {
                  "type": "string",
                  "enum": ["PLANNER", "DIRECT_TOOL"],
                  "description": "The next step to take if the QuickShotResponse is insufficient."
                },
                "tools": {
                  "type": "array",
                  "description": "A list of recommended tools to use. One tool for DIRECT_TOOL, multiple for PLANNER.",
                  "items": {
                    "type": "String",
                    "enum": ["RAG_SERVICE", "MCP_CLIENT"]
                  }
                },
                "rephrasedResponse": "string"
              },
              "required": ["sufficient", "rephrasedResponse"],
              "additionalProperties": false,
              "allOf": [
                {
                  "if": {
                    "properties": { "actionMode": { "const": "DIRECT_TOOL" } },
                    "required": ["actionMode"]
                  },
                  "then": {
                    "required": ["tools"],
                    "properties": {
                      "tools": {
                        "minItems": 1
                      }
                    }
                  }
                }
              ]
            }
            """;

    private final LLMCallerService llmCallerService;

    public Mono<PreflightClassifierResult> classify(String query, QuickShotResponse quickShotResponse) {
        String systemMessage = PREFLIGHT_CLASSIFIER_SYSTEM_MESSAGE
                .replace(PromptFormat.SCHEMA_JSON, PREFLIGHT_CLASSIFIER_SCHEMA)
                .replace(PromptFormat.TOOLS_METADATA, ToolManifest.describeAll());

        String userMessage = PREFLIGHT_CLASSIFIER_USER_MESSAGE
                .replace(PromptFormat.QUERY, query)
                .replace(PromptFormat.QUICKSHOT_RESPONSE, quickShotResponse.toString());

        return ReactiveUtils.runBlockingAsync(() -> llmCallerService.callLLMWithSchemaValidation(chatClient ->
                chatClient.prompt()
                        .system(systemMessage)
                        .user(userMessage), PreflightClassifierResult.class));
    }

}