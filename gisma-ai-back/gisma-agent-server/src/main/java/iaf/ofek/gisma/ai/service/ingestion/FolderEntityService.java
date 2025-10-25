package iaf.ofek.gisma.ai.service.ingestion;

import iaf.ofek.gisma.ai.entity.ingestion.FolderEntity;
import iaf.ofek.gisma.ai.repository.FolderEntityRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FolderEntityService {

    private final FolderEntityRepository folderEntityRepository;

    public List<FolderEntity> getSubRootFolders() {
        return folderEntityRepository.findAllChildrenOfRootWithChildren();
    }

    public FolderEntity getFileParentFolder(UUID folderId) {
        if (folderId == null) {
            return folderEntityRepository.findRootFolder();
        }

        return folderEntityRepository.findById(folderId)
                .orElseThrow(()-> new EntityNotFoundException("folder with id: `%s` not found".formatted(folderId)));
    }

}
