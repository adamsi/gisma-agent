package iaf.ofek.gisma.ai.dto.agent;

import java.util.List;

public record PlannerResult(
        List<PlannerStep> steps,
        String explanation
) {}
