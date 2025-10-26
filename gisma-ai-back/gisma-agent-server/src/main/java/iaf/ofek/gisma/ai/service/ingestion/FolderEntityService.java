package iaf.ofek.gisma.ai.service.ingestion;

import iaf.ofek.gisma.ai.dto.ingestion.CreateFolderDTO;
import iaf.ofek.gisma.ai.entity.ingestion.DocumentEntity;
import iaf.ofek.gisma.ai.entity.ingestion.FolderEntity;
import iaf.ofek.gisma.ai.repository.FolderEntityRepository;
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

    private final ParentFolderFetcherService parentFolderFetcherService;

    @Transactional
    public FolderEntity createFolder(CreateFolderDTO createFolderDTO) {
        FolderEntity parentFolder = parentFolderFetcherService.getParentFolder(createFolderDTO.getParentFolderId());
        FolderEntity newFolder = FolderEntity.builder()
                .name(createFolderDTO.getName())
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
