package iaf.ofek.gisma.ai.service.ingestion;

import iaf.ofek.gisma.ai.dto.DocumentDTO;
import iaf.ofek.gisma.ai.entity.DocumentEntity;
import iaf.ofek.gisma.ai.service.auth.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.stream.IntStream;

@Service
@RequiredArgsConstructor
public class IngestionService {

    private final AuthService authService;

    private final DocumentProcessor documentProcessor;

//    public List<CompletableFuture<DocumentEntity>> processFiles(List<MultipartFile> files, List<String> documentIds) {
//        if (files.size() != documentIds.size()) {
//            throw new IllegalArgumentException("Files and documentIds must have the same size");
//        }
//
//        List<DocumentDTO> documents = IntStream.range(0, files.size())
//                .mapToObj(i -> new DocumentDTO(documentIds.get(i), files.get(i)))
//                .toList();
//
//        return processFiles(documents);
//    }


    public List<CompletableFuture<DocumentEntity>> processFiles(List<DocumentDTO> documents) {
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

    public Mono<Void> deleteFiles(List<DocumentEntity> documentEntities) {
        return documentProcessor.deleteDocuments(documentEntities);
    }


    private boolean isSupported(MultipartFile file) {
        return !file.isEmpty() && file.getContentType() != null &&
                List.of("application/pdf", "text/plain", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
                        .contains(file.getContentType());
    }

}
