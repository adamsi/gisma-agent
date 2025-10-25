package iaf.ofek.gisma.ai.service.ingestion;

import iaf.ofek.gisma.ai.dto.ingestion.FolderDTO;
import iaf.ofek.gisma.ai.entity.ingestion.DocumentEntity;
import iaf.ofek.gisma.ai.entity.ingestion.FolderEntity;
import iaf.ofek.gisma.ai.repository.FolderEntityRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FolderEntityService {

    private final FolderEntityRepository folderEntityRepository;

    private final DocumentProcessor documentProcessor;

    public FolderEntity getRootFolder() {
        FolderEntity rootFolder = folderEntityRepository.findRootFolderWithChildrenFolders()
                .orElseThrow(() -> new EntityNotFoundException("root folder not found"));

        folderEntityRepository.findRootFolderWithChildrenDocuments()
                .ifPresent(f -> rootFolder.setChildrenDocuments(f.getChildrenDocuments()));

        return rootFolder;
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

    @Transactional
    public void deleteFolders(List<UUID> ids) {
        for (UUID id : ids) {
            FolderEntity folder = folderEntityRepository.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Failed to find folder with id: " + id));

            if (!folder.getChildrenDocuments().isEmpty()) {
                List<UUID> docIds = folder.getChildrenDocuments()
                        .stream()
                        .map(DocumentEntity::getId)
                        .toList();

                documentProcessor.deleteDocuments(docIds);
            }

            if (!folder.getChildrenFolders().isEmpty()) {
                List<UUID> childFolderIds = folder.getChildrenFolders()
                        .stream()
                        .map(FolderEntity::getId)
                        .toList();

                deleteFolders(childFolderIds);
            }

            folderEntityRepository.delete(folder);
        }
    }

}
