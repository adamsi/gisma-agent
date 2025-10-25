package iaf.ofek.gisma.ai.controller.ingestion;

import iaf.ofek.gisma.ai.dto.ingestion.DocumentDTO;
import iaf.ofek.gisma.ai.entity.ingestion.DocumentEntity;
import iaf.ofek.gisma.ai.service.ingestion.IngestionService;
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

    private final IngestionService ingestionService;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> upload(@RequestPart("files") List<MultipartFile> files,
                                    @RequestPart("documents") List<DocumentDTO> documentDTOS) {
        log.info("Uploading {} files.", files.size());
        List<DocumentEntity> results = ingestionService.processFiles(files, documentDTOS);
        log.info("Uploaded {} files successfully.", results.size());

        return ResponseEntity.status(HttpStatus.CREATED).body(results);
    }


    @DeleteMapping("/delete")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> delete(@RequestBody List<UUID> ids) {
        ingestionService.deleteFiles(ids);

        return ResponseEntity.status(HttpStatus.NO_CONTENT)
                .build();
    }

}
