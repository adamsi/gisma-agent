package iaf.ofek.sigma.ai.dto.agent;

import java.util.List;

public record PlannerResult(
        List<PlannerStep> steps,
        String explanation
) {}
