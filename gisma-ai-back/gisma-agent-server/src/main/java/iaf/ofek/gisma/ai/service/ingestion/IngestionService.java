package iaf.ofek.gisma.ai.service.ingestion;

import iaf.ofek.gisma.ai.dto.DocumentDTO;
import iaf.ofek.gisma.ai.service.auth.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.concurrent.CompletableFuture;

@Service
@RequiredArgsConstructor
public class IngestionService {

    private final AuthService authService;

    private final DocumentProcessor documentProcessor;

    public List<CompletableFuture<DocumentDTO>> processFiles(List<DocumentDTO> documents) {
        String userId = authService.getCurrentUserId();

        return documents.stream()
                .filter(document -> isSupported(document.getFile()))
                .map(document -> {
                    try {
                        return documentProcessor.processFile(document, userId);
                    } catch (Exception e) {
                    throw new IllegalArgumentException("Failed processing files, try again...");
                    }
                })
                .toList();
    }

    private boolean isSupported(MultipartFile file) {
        return !file.isEmpty() && file.getContentType() != null &&
                List.of("application/pdf", "text/plain", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
                        .contains(file.getContentType());
    }

}
