package iaf.ofek.sigma.ai.service.ingestion;

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

    public void processFiles(List<MultipartFile> files) {
        String userId = authService.getCurrentUserId();
        files.stream()
                .filter(file -> !file.isEmpty())
                .forEach(file -> documentProcessor.processFile(file, userId));
    }

}
