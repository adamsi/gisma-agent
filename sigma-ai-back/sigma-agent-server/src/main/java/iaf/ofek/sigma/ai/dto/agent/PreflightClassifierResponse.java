package iaf.ofek.sigma.ai.dto.agent;

public record PreflightClassifierResponse(
        boolean sufficient,
        double confidenceScore,
        boolean requiresDataFetching,
        boolean requiresPlanning
) {}
