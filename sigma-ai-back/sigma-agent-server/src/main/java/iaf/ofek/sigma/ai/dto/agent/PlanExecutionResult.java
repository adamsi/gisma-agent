package iaf.ofek.sigma.ai.dto.agent;

import java.util.List;

public record PlanExecutionResult(
        List<StepExecutionResult> stepResults, // all executed steps
        boolean success,                        // overall plan success
        String aggregatedOutput,                // combined textual output from all steps
        String errorMessage                      // optional error info if any step failed
) {

    public static PlanExecutionResult buildResult(boolean isSuccess, List<StepExecutionResult> stepResults) {
        return isSuccess ? success(stepResults) : failure(stepResults);
    }

    public static PlanExecutionResult success(List<StepExecutionResult> stepResults) {
        StringBuilder aggregatedOutput = new StringBuilder();

        for (StepExecutionResult step : stepResults) {
            String description = step.step().description() != null ? step.step().description() : "No description";
            aggregatedOutput.append("- Step: ").append(description).append("\n")
                    .append("  Output: ").append(step.output()).append("\n");
        }

        return new PlanExecutionResult(
                stepResults,
                true,                    // overall success
                aggregatedOutput.toString(), // formatted aggregated output
                null                      // no error
        );
    }


    public static PlanExecutionResult failure(List<StepExecutionResult> stepResults) {
        StringBuilder aggregatedOutput = new StringBuilder();

        for (StepExecutionResult step : stepResults) {
            String description = step.step().description() != null ? step.step().description() : "No description";
            String output = step.output() != null && !step.output().isEmpty() ? step.output() : "<No output / failed>";
            aggregatedOutput.append("- Step: ").append(description).append("\n")
                    .append("  Output: ").append(output).append("\n")
                    .append("  Success: ").append(step.success()).append("\n");
        }

        return new PlanExecutionResult(
                stepResults,
                false,                     // overall failure
                aggregatedOutput.toString(), // formatted aggregated output
                "One or more steps failed" // error message
        );
    }

}