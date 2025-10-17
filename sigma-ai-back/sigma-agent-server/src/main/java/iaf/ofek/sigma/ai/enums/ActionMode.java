package iaf.ofek.sigma.ai.enums;

import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public enum ActionMode {

    DIRECT_TOOL,

    PLANNER;

    public static ActionMode fromString(String str) {
        for (ActionMode mode : ActionMode.values()) {
            if (mode.name().equalsIgnoreCase(str)) {
                return mode;
            }
        }

        throw new IllegalArgumentException(String.format("Unknown executor mode `%s`", str));
    }

}
