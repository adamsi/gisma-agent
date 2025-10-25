package iaf.ofek.gisma.ai.controller.ingestion;


import iaf.ofek.gisma.ai.dto.ingestion.FolderDTO;
import iaf.ofek.gisma.ai.service.ingestion.FolderEntityService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/ingestion/folders")
@RequiredArgsConstructor
@Validated
public class FolderController {

    private final FolderEntityService folderEntityService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getRootFolder() { // TODO: make reactive
        return ResponseEntity.status(HttpStatus.OK)
                .body(folderEntityService.getRootFolder());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createFolder(@RequestBody @Valid FolderDTO folderDTO) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(folderEntityService.createFolder(folderDTO));
    }

    @DeleteMapping("/delete")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> delete(@RequestBody List<UUID> ids) {
        folderEntityService.deleteFolders(ids);

        return ResponseEntity.status(HttpStatus.NO_CONTENT)
                .build();
    }

}
