package iaf.ofek.gisma.ai.service.ingestion;

import iaf.ofek.gisma.ai.entity.ingestion.S3Folder;
import iaf.ofek.gisma.ai.repository.FolderEntityRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ParentFolderFetcherService {

    private final FolderEntityRepository folderEntityRepository;

    public S3Folder getParentFolder(UUID id) {
        if (id == null) {
            return getRootFolder();
        }

        return folderEntityRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("folder with id: `%s` not found".formatted(id)));
    }

    public S3Folder getRootFolder() {
        S3Folder rootFolder = folderEntityRepository.findRootFolderWithChildrenFolders()
                .orElseThrow(() -> new EntityNotFoundException("root folder not found"));

        folderEntityRepository.findRootFolderWithChildrenDocuments()
                .ifPresent(f -> rootFolder.setChildrenDocuments(f.getChildrenDocuments()));

        return rootFolder;
    }

}
