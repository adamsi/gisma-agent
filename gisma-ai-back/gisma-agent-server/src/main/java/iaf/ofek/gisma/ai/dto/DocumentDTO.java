package iaf.ofek.gisma.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

@Data
@AllArgsConstructor
public class DocumentDTO {
    private String documentId;
    private MultipartFile file;
}

