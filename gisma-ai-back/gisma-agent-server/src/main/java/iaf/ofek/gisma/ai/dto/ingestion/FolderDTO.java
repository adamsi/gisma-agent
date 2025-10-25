package iaf.ofek.gisma.ai.dto.ingestion;

import lombok.AllArgsConstructor;
import lombok.Data;

import javax.validation.constraints.NotNull;
import java.util.UUID;

@Data
@AllArgsConstructor
public class FolderDTO {

    @NotNull(message = "can't be null")
    private String name;

    private UUID parentId;

}
