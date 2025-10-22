package iaf.ofek.gisma.ai.dto.agent;

public record QuickShotResponse(
        String responseText,
        double confidenceScore,
        boolean requiresDataFetching,
        boolean requiresPlanning
) {}
