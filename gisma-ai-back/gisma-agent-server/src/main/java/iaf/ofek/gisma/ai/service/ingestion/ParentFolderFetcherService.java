package iaf.ofek.gisma.ai.service.ingestion;

import iaf.ofek.gisma.ai.entity.ingestion.FolderEntity;
import iaf.ofek.gisma.ai.repository.FolderEntityRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ParentFolderFetcherService {

    private final FolderEntityRepository folderEntityRepository;

    public FolderEntity getParentFolder(UUID id) {
        if (id == null) {
            return getRootFolder();
        }

        return folderEntityRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("folder with id: `%s` not found".formatted(id)));
    }

    public FolderEntity getRootFolder() {
        FolderEntity rootFolder = folderEntityRepository.findRootFolderWithChildrenFolders()
                .orElseThrow(() -> new EntityNotFoundException("root folder not found"));

        folderEntityRepository.findRootFolderWithChildrenDocuments()
                .ifPresent(f -> rootFolder.setChildrenDocuments(f.getChildrenDocuments()));

        return rootFolder;
    }

}
