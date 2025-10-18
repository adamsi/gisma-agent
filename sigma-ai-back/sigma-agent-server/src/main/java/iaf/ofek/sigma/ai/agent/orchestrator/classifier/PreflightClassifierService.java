package iaf.ofek.sigma.ai.agent.orchestrator.classifier;

import iaf.ofek.sigma.ai.agent.prompt.PromptFormat;
import iaf.ofek.sigma.ai.dto.agent.PreflightClassifierResponse;
import iaf.ofek.sigma.ai.dto.agent.QuickShotResponse;
import iaf.ofek.sigma.ai.agent.llmCaller.LLMCallerService;
import iaf.ofek.sigma.ai.enums.ToolManifest;
import iaf.ofek.sigma.ai.util.ReactiveUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;


@Service
@RequiredArgsConstructor
public class PreflightClassifierService {

    private static final String PREFLIGHT_CLASSIFIER_SYSTEM_MESSAGE = """
                You are a Preflight Classifier for the Sigma AI system.
            
                You will receive:
                1. The user's query.
                2. The QuickShotResponse from the RAG/LLM quick retrieval phase:
                   {
                     "responseText": "...",
                     "confidenceScore": 0.0-1.0,
                     "requiresDataFetching": true/false,
                     "requiresPlanning": true/false
                   }
            
                Available Tools:
                {tools_metadata}
            
                Your task:
                1. Determine whether the QuickShotResponse fully answers the user's query (sufficient).
                2. If not sufficient, choose the next action:
                   - "DIRECT_TOOL": if the user query can be answered with a direct tool/API call using MCP.
                   - "PLANNER": if the query requires multi-step reasoning, orchestration, or combined tool usage.
                3. Rephrase the QuickShotResponse text to fix typos, improve grammar, and make it well-structured.
                       - This should be included in the output as `rephrasedResponse`.
                       - Do this regardless of whether the response is sufficient or not, if response is already perfect, just copy paste it to rephrasedResponse.
            
                Guidelines:
                - Always return a valid JSON object matching the ClassifierResponse schema:
                  {schema_json}
            
                - Consider the QuickShotResponse fields when making your decision:
                  - confidenceScore: higher means more likely sufficient.
                  - requiresDataFetching / requiresPlanning: indicates additional work may be needed.
                - Only include actionMode and tools if sufficient == false.
                - When actionMode is "DIRECT_TOOL", select the most relevant single tool from the available metadata.
                - When actionMode is "PLANNER", recommend multiple tools that might be useful together.
                - Be concise and precise in your explanation.
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

    public Mono<PreflightClassifierResponse> classify(String query, QuickShotResponse quickShotResponse) {
        String systemMessage = PREFLIGHT_CLASSIFIER_SYSTEM_MESSAGE
                .replace(PromptFormat.SCHEMA_JSON, PREFLIGHT_CLASSIFIER_SCHEMA)
                .replace(PromptFormat.TOOLS_METADATA, ToolManifest.describeAll());

        String userMessage = PREFLIGHT_CLASSIFIER_USER_MESSAGE
                .replace(PromptFormat.QUERY, query)
                .replace(PromptFormat.QUICKSHOT_RESPONSE, quickShotResponse.toString());

        return ReactiveUtils.runBlockingAsync(()-> llmCallerService.callLLMWithSchemaValidation(chatClient ->
                chatClient.prompt()
                        .system(systemMessage)
                        .user(userMessage), PreflightClassifierResponse.class));
    }

}