package iaf.ofek.gisma.ai.controller;

import iaf.ofek.gisma.ai.dto.DocumentDTO;
import iaf.ofek.gisma.ai.service.ingestion.IngestionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final IngestionService ingestionService;

    @PostMapping("/upload")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> upload(@RequestParam("documents") List<DocumentDTO> documents) {
        List<CompletableFuture<DocumentDTO>> futures = ingestionService.processFiles(documents);
        List<DocumentDTO> results = futures.stream()
                .map(CompletableFuture::join)
                .toList();

        return new ResponseEntity<>(results, HttpStatus.CREATED);
    }

}
