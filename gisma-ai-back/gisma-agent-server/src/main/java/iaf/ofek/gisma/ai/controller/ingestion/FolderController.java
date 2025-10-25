package iaf.ofek.gisma.ai.controller.ingestion;


import iaf.ofek.gisma.ai.dto.ingestion.FolderDTO;
import iaf.ofek.gisma.ai.entity.ingestion.FolderEntity;
import iaf.ofek.gisma.ai.service.ingestion.FolderEntityService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;

@RestController
@RequestMapping("/ingestion/folders")
@RequiredArgsConstructor
@Validated
public class FolderController {

    private final FolderEntityService folderEntityService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public FolderEntity getRootFolder() { // TODO: make reactive
        return folderEntityService.getRootFolder();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public FolderEntity createFolder(@RequestBody @Valid FolderDTO folderDTO) {
        return folderEntityService.createFolder(folderDTO);
    }

}
