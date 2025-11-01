package iaf.ofek.gisma.ai.agent.orchestrator.classifier;

import iaf.ofek.gisma.ai.agent.llmCall.LLMCallerService;
import iaf.ofek.gisma.ai.agent.prompt.PromptFormat;
import iaf.ofek.gisma.ai.dto.agent.PreflightClassifierResult;
import iaf.ofek.gisma.ai.dto.agent.QuickShotResponse;
import iaf.ofek.gisma.ai.enums.ToolManifest;
import iaf.ofek.gisma.ai.util.ReactiveUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;


@Service
@RequiredArgsConstructor
public class PreflightClassifierService {

    private static final String PREFLIGHT_CLASSIFIER_SYSTEM_MESSAGE = """
            You are the Preflight Classifier for Gisma AI.
            
            Inputs:
            1. User query.
            2. QuickShotResponse (responseText, confidenceScore, requiresDataFetching, requiresPlanning).
            3. Available tools: {tools_metadata}.
            
            Tasks:
            - Only set `sufficient` to true when the query does NOT require data retrieval and the QuickShotResponse fully answers it.
            
            - If `sufficient` is false, choose `actionMode` based on the following rules:
              1. **DIRECT_TOOL** → Use this when the query can be answered by a single tool.
                 - Use **MCP_CLIENT** by default for any data, API, factual, numeric, or retrieval query (anything involving fetching from services, databases, or structured sources).
                 - Use **RAG_SERVICE** only for queries that ask about:
                     • Documentation, concepts, how-to guides
              2. **PLANNER** → Use this when the query requires multiple tools, complex reasoning, or cross-source synthesis.
            
            - Always include `rephrasedResponse`: a grammatically correct and well-structured version of the user query combined with relevant details from QuickShotResponse.
            
            - Output valid JSON according to {schema_json}.
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
                    "enum": ["MCP_CLIENT", "RAG_SERVICE"]
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