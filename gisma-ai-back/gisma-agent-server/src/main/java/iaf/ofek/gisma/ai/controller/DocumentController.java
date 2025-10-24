package iaf.ofek.gisma.ai.controller;

import iaf.ofek.gisma.ai.dto.DocumentDTO;
import iaf.ofek.gisma.ai.entity.ingestion.DocumentEntity;
import iaf.ofek.gisma.ai.entity.ingestion.FolderEntity;
import iaf.ofek.gisma.ai.service.ingestion.FolderEntityService;
import iaf.ofek.gisma.ai.service.ingestion.IngestionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final IngestionService ingestionService;

    private final FolderEntityService folderEntityService;

    @PostMapping("/upload")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> upload(@RequestParam("documents") List<DocumentDTO> documents) {
        List<CompletableFuture<DocumentEntity>> futures = ingestionService.processFiles(documents);
        List<DocumentEntity> results = futures.stream()
                .map(CompletableFuture::join)
                .toList();

        return new ResponseEntity<>(results, HttpStatus.CREATED);
    }

    @PostMapping("/delete")
    @PreAuthorize("hasRole('ADMIN')")
    public Mono<Void> delete(@RequestBody List<DocumentEntity> documents) {
         return ingestionService.deleteFiles(documents);
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<FolderEntity> findRootFolders() {
        return folderEntityService.findRootFolders();
    }

}
