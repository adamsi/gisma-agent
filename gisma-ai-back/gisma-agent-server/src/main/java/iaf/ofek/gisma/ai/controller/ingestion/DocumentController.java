package iaf.ofek.gisma.ai.controller.ingestion;

import iaf.ofek.gisma.ai.entity.ingestion.S3Document;
import iaf.ofek.gisma.ai.service.ingestion.DocumentProcessor;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/ingestion/documents")
@RequiredArgsConstructor
@Validated
@Log4j2
public class DocumentController {

    private final DocumentProcessor documentProcessor;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createNewDocument(@RequestPart("files") List<MultipartFile> files,
                                               @RequestPart("parentFolderId") String parentFolderId) {
        log.info("Uploading {} files.", files.size());
        List<S3Document> results = documentProcessor.saveNewDocuments(files, List.of(UUID.fromString(parentFolderId)));
        log.info("Uploaded {} files successfully.", results.size());

        return ResponseEntity.status(HttpStatus.CREATED).body(results);
    }

    @PatchMapping(value = "/edit", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> editDocument(@RequestPart("file") MultipartFile file, @RequestPart("id") String id) {
        S3Document document = documentProcessor.editDocument(file, UUID.fromString(id));

        return ResponseEntity.status(HttpStatus.OK).body(document);
    }


    @DeleteMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> delete(@RequestBody List<UUID> ids) {
        documentProcessor.deleteDocuments(ids);

        return ResponseEntity.status(HttpStatus.NO_CONTENT)
                .build();
    }

}
