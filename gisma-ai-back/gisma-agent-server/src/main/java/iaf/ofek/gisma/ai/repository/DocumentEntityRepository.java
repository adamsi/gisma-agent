package iaf.ofek.gisma.ai.repository;

import iaf.ofek.gisma.ai.entity.ingestion.DocumentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface DocumentEntityRepository extends JpaRepository<DocumentEntity, UUID> {
}
