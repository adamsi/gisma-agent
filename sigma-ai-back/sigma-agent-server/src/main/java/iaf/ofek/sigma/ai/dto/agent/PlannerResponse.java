package iaf.ofek.sigma.ai.dto.agent;

import java.util.List;

public record PlannerResponse(
        List<PlannerStep> steps
) {}
