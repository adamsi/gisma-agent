package iaf.ofek.gisma.ai.dto.agent;

public record StepExecutionResult(
        PlannerStep step,    // reference to the original step
        String output,       // textual output or serialized response
        boolean success,     // did the step complete successfully
        String errorMessage  // optional error info if failed
) {}
