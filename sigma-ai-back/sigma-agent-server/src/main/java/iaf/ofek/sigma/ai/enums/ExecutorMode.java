package iaf.ofek.sigma.ai.enums;

import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public enum ExecutorMode {

    DIRECT_TOOL,

    PLANNER;

    public static ExecutorMode fromString(String str) {
        for (ExecutorMode mode : ExecutorMode.values()) {
            if (mode.name().equalsIgnoreCase(str)) {
                return mode;
            }
        }

        throw new IllegalArgumentException(String.format("Unknown executor mode `%s`", str));
    }

}
