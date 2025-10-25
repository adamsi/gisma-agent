package iaf.ofek.gisma.ai.service.ingestion;

import iaf.ofek.gisma.ai.dto.ingestion.FolderDTO;
import iaf.ofek.gisma.ai.entity.ingestion.FolderEntity;
import iaf.ofek.gisma.ai.repository.FolderEntityRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FolderEntityService {

    private final FolderEntityRepository folderEntityRepository;

    public FolderEntity getRootFolder() {
        return folderEntityRepository.findRootFolderWithChildren()
                .orElseThrow(() -> new EntityNotFoundException("root folder not found"));
    }

    public FolderEntity getFileParentFolder(UUID folderId) {
        if (folderId == null) {
            return getRootFolder();
        }

        return folderEntityRepository.findById(folderId)
                .orElseThrow(() -> new EntityNotFoundException("folder with id: `%s` not found".formatted(folderId)));
    }

    @Transactional
    public FolderEntity createFolder(FolderDTO folderDTO) {
        FolderEntity parentFolder = getFileParentFolder(folderDTO.getParentId());
        FolderEntity newFolder = FolderEntity.builder()
                .name(folderDTO.getName())
                .parentFolder(parentFolder)
                .build();

        return folderEntityRepository.save(newFolder);
    }

}
