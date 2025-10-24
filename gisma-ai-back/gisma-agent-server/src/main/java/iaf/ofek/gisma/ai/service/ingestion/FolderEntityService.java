package iaf.ofek.gisma.ai.service.ingestion;

import iaf.ofek.gisma.ai.entity.ingestion.FolderEntity;
import iaf.ofek.gisma.ai.repository.FolderEntityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FolderEntityService {

    private final FolderEntityRepository folderEntityRepository;

    public List<FolderEntity> findRootFolders() {
        return folderEntityRepository.findAllRootsWithChildren();
    }

}
