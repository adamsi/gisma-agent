package iaf.ofek.gisma.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@Data
@AllArgsConstructor
public class DocumentDTO {
    private UUID documentId;
    private UUID parentFolderId;
    private MultipartFile file;
}

