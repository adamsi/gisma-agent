package iaf.ofek.gisma.ai.dto.agent;

import iaf.ofek.gisma.ai.enums.ActionMode;
import iaf.ofek.gisma.ai.enums.ToolManifest;

import java.util.List;

public record PreflightClassifierResult(
        boolean sufficient,
        ActionMode actionMode,
        List<ToolManifest> tools,
        String rephrasedResponse
) {}
