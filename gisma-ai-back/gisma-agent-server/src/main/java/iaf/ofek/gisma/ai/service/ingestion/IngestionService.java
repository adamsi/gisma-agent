package iaf.ofek.gisma.ai.service.ingestion;

import iaf.ofek.gisma.ai.dto.ingestion.DocumentDTO;
import iaf.ofek.gisma.ai.entity.ingestion.DocumentEntity;
import iaf.ofek.gisma.ai.service.auth.AuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;
import java.util.stream.IntStream;

@Service
@RequiredArgsConstructor
@Log4j2
public class IngestionService {

    private final AuthService authService;

    private final DocumentProcessor documentProcessor;

    public List<DocumentEntity> processFiles(List<MultipartFile> files, List<DocumentDTO> documentDTOS) {
        if (files.size() != documentDTOS.size()) {
            throw new IllegalArgumentException("Files and documentDTOs must have the same size");
        }

        List<DocumentDTO> documents = IntStream.range(0, files.size())
                .mapToObj(i -> new DocumentDTO(documentDTOS.get(i).getDocumentId(), documentDTOS.get(i).getParentFolderId(),
                        files.get(i)))
                .toList();

        return processFiles(documents);
    }


    public List<DocumentEntity> processFiles(List<DocumentDTO> documents) {
        String userId = authService.getCurrentUserId();

        return documents.stream()
                .filter(document -> isSupported(document.getFile()))
                .map(document -> {
                    try {
                        return documentProcessor.processFile(document, userId);
                    } catch (Exception e) {
                        log.warn("Failed processing files: {}.", e.getMessage());
                        throw new IllegalArgumentException("Failed processing files, try again...");
                    }
                })
                .toList();
    }

    public void deleteFiles(List<UUID> ids) {
         documentProcessor.deleteDocuments(ids);
    }


    private boolean isSupported(MultipartFile file) {
        return !file.isEmpty() && file.getContentType() != null &&
                List.of("application/pdf", "text/plain", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
                        .contains(file.getContentType());
    }

}
