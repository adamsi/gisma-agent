package iaf.ofek.gisma.ai.service.ingestion;

import iaf.ofek.gisma.ai.dto.ingestion.CreateDocumentDTO;
import iaf.ofek.gisma.ai.entity.ingestion.DocumentEntity;
import iaf.ofek.gisma.ai.repository.DocumentEntityRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Log4j2
public class DocumentEntityService {

    private final DocumentEntityRepository documentEntityRepository;

    private final ParentFolderFetcherService parentFolderFetcherService;

    private final IngestionService ingestionService;

    private final S3Service s3Service;

    @Transactional
    public List<DocumentEntity> createNewDocuments(List<CreateDocumentDTO> documents, String userId) {
        return documents.stream()
                .map(document -> {
                    validateFile(document.getFile());

                    try {
                        return createNewDocument(document, userId);
                    } catch (Exception e) {
                        log.warn("Failed processing files: {}.", e.getMessage());
                        throw new IllegalArgumentException("Failed processing files, try again...");
                    }
                })
                .toList();
    }

    @Transactional
    public void deleteDocuments(List<UUID> documentIds) {
        List<DocumentEntity> documents = documentEntityRepository.findAllById(documentIds);
        documentEntityRepository.deleteAll(documents);
        documents.forEach(documentEntity -> {
            ingestionService.deleteDocument(documentEntity);
            s3Service.deleteFile(documentEntity.getUrl());
        });
    }

    @Transactional
    public DocumentEntity editDocument(MultipartFile file, UUID documentId, String userId) {
        validateFile(file);

        var documentEntity = documentEntityRepository.findById(documentId)
                .orElseThrow(() -> new EntityNotFoundException("Document with id: `%s` not found".formatted(documentId)));
        s3Service.deleteFile(documentEntity.getUrl());
        String url = s3Service.uploadFile(file);
        documentEntity.setUrl(url);
        documentEntity.setName(file.getOriginalFilename());
        documentEntity.setContentType(file.getContentType());
        ingestionService.deleteDocument(documentEntity);
        ingestionService.ingestToVectorStore(file, documentEntity, userId);

        return documentEntityRepository.save(documentEntity);
    }

    private DocumentEntity createNewDocument(CreateDocumentDTO document, String userId) {
        var file = document.getFile();
        var parentFolder = parentFolderFetcherService.getParentFolder(document.getParentFolderId());
        DocumentEntity documentEntity = DocumentEntity.builder()
                .name(file.getOriginalFilename())
                .contentType(file.getContentType())
                .parentFolder(parentFolder)
                .build();
        documentEntity = documentEntityRepository.save(documentEntity);
        ingestionService.ingestToVectorStore(file, documentEntity, userId);
        String url = s3Service.uploadFile(file);
        documentEntity.setUrl(url);

        return documentEntity;
    }


    private void validateFile(MultipartFile file) {
        if (file.isEmpty() || file.getContentType() == null) {
            throw new IllegalArgumentException("Uploaded file is empty");
        }

        if (!List.of("application/pdf", "text/plain", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
                .contains(file.getContentType())) {
            throw new IllegalArgumentException("Uploaded file contentType is not supported");
        }

    }

}
