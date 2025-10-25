package iaf.ofek.gisma.ai.repository;

import iaf.ofek.gisma.ai.entity.ingestion.FolderEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FolderEntityRepository extends JpaRepository<FolderEntity, UUID> {

    @Query("SELECT f FROM FolderEntity f " +
            "LEFT JOIN FETCH f.childrenFolders cf " +
            "LEFT JOIN FETCH f.childrenDocuments d " +
            "WHERE f.name = '/'")
    Optional<FolderEntity> findRootFolderWithChildren();

    @Query("SELECT f FROM FolderEntity f WHERE f.name = '/'")
    Optional<FolderEntity> findRootFolder();

}
