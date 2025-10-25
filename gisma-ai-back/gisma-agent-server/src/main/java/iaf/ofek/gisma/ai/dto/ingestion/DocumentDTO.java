package iaf.ofek.gisma.ai.dto.ingestion;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.web.multipart.MultipartFile;

import javax.validation.constraints.NotNull;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class DocumentDTO {

    private UUID documentId;

    private UUID parentFolderId;

    @NotNull(message = "can't be null")
    private MultipartFile file;

}

