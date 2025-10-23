package iaf.ofek.gisma.ai.dto;

import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

@Data
public class DocumentDTO {
    private String documentId;
    private MultipartFile file;
}

