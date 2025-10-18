package iaf.ofek.sigma.ai.util;

import java.util.List;

public class StringUtils {

    public static String joinLines(List<String> lines) {
        return lines == null ? "" : String.join("\n", lines);
    }

}
