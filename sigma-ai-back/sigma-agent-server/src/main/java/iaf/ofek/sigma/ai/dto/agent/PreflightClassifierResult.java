package iaf.ofek.sigma.ai.dto.agent;

import iaf.ofek.sigma.ai.enums.ActionMode;
import iaf.ofek.sigma.ai.enums.ToolManifest;

import java.util.List;

public record PreflightClassifierResult(
        boolean sufficient,
        ActionMode actionMode,
        List<ToolManifest> tools,
        String rephrasedResponse
) {}
