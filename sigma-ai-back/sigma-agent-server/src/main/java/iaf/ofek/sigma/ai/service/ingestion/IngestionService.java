package iaf.ofek.sigma.ai.service.ingestion;

import iaf.ofek.sigma.ai.dto.FileProcessingResult;
import iaf.ofek.sigma.ai.service.auth.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
@RequiredArgsConstructor
public class IngestionService {

    private final AuthService authService;

    private final DocumentProcessor documentProcessor;

    public List<FileProcessingResult> processFiles(List<MultipartFile> files) {
        String userId = authService.getCurrentUserId();
        return files.stream()
                .filter(file -> !file.isEmpty() && isSupported(file))
                .map(file -> {
                    try {
                        documentProcessor.processFile(file, userId);
                        return new FileProcessingResult(file.getName(), true, "Uploaded successfully");
                    } catch (Exception e) {
                        return new FileProcessingResult(file.getName(), false, e.getMessage());
                    }
                })
                .toList();
    }

    private boolean isSupported(MultipartFile file) {
        return file.getContentType() != null &&
                List.of("application/pdf", "text/plain", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
                        .contains(file.getContentType());
    }

}
