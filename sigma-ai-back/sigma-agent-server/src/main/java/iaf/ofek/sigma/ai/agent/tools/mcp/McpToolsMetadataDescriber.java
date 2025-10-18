package iaf.ofek.sigma.ai.agent.tools.mcp;

import iaf.ofek.sigma.ai.util.StringUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;
import org.springframework.stereotype.Service;

import java.util.Arrays;

@Service
@RequiredArgsConstructor
public class McpToolsMetadataDescriber implements ApplicationContextAware {

    private static ToolCallbackProvider toolCallbackProvider;

    @Override
    public void setApplicationContext(ApplicationContext applicationContext) {
     toolCallbackProvider = applicationContext.getBean(ToolCallbackProvider.class);
    }

    public static String describeAllTools() {
        if (toolCallbackProvider == null) {
            return "";
        }

        return StringUtils.joinLines(Arrays.stream(toolCallbackProvider.getToolCallbacks())
                .map(callback -> String.format(
                        "- %s: %s. inputSchema: %s",
                        callback.getToolDefinition().name(),
                        callback.getToolDefinition().description(),
                        callback.getToolDefinition().inputSchema()
                ))
                .toList());
    }

}
