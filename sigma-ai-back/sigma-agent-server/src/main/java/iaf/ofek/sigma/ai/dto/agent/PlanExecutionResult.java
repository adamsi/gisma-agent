package iaf.ofek.sigma.ai.dto.agent;

import java.util.List;

public record PlanExecutionResult(
        List<StepExecutionResult> stepResults, // all executed steps
        boolean success,                        // overall plan success
        String aggregatedOutput,                // combined textual output from all steps
        String errorMessage                      // optional error info if any step failed
) {

    public static PlanExecutionResult success(List<StepExecutionResult> stepResults) {
        String aggregated = stepResults.stream()
                .map(StepExecutionResult::output)
                .filter(s -> s != null && !s.isEmpty())
                .reduce((a, b) -> a + "\n" + b)
                .orElse("");
        return new PlanExecutionResult(stepResults, true, aggregated, null);
    }

    public static PlanExecutionResult failure(List<StepExecutionResult> stepResults, String errorMessage) {
        return new PlanExecutionResult(stepResults, false, null, errorMessage);
    }
}