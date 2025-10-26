package iaf.ofek.gisma.ai.service.ingestion;

import iaf.ofek.gisma.ai.dto.ingestion.DocumentDTO;
import iaf.ofek.gisma.ai.entity.ingestion.DocumentEntity;
import iaf.ofek.gisma.ai.entity.ingestion.FolderEntity;
import iaf.ofek.gisma.ai.repository.DocumentEntityRepository;
import iaf.ofek.gisma.ai.repository.FolderEntityRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.extern.log4j.Log4j2;
import org.apache.tika.Tika;
import org.apache.tika.exception.TikaException;
import org.springframework.ai.document.Document;
import org.springframework.ai.transformer.splitter.TextSplitter;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.multipart.MultipartFile;

import javax.validation.Valid;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;

@Component
@Log4j2
@Validated
public class DocumentProcessor {

    public static final String USER_ID = "userId";
    public static final String FILENAME = "filename";
    public static final String CONTENT_TYPE = "contentType";
    public static final String DOCUMENT_ID = "documentId";

    private static final Tika tika = new Tika();
    private static final TextSplitter textSplitter = new TokenTextSplitter();

    private final VectorStore documentVectorStore;
    private final DocumentEntityRepository documentRepository;
    private final FolderEntityRepository folderEntityRepository;
    private final S3Service s3Service;

    public DocumentProcessor(
            @Qualifier("documentVectorStore") VectorStore documentVectorStore,
            DocumentEntityRepository documentRepository,
            FolderEntityRepository folderEntityRepository,
            S3Service s3Service
    ) {
        this.documentVectorStore = documentVectorStore;
        this.documentRepository = documentRepository;
        this.folderEntityRepository = folderEntityRepository;
        this.s3Service = s3Service;
    }

    @Transactional
    public DocumentEntity processFile(@Valid DocumentDTO documentInput, String userId) {
        AtomicBoolean toDelete = new AtomicBoolean(true);
        DocumentEntity document;

        if (documentInput.getDocumentId() != null) {
             document = documentRepository.findById(documentInput.getDocumentId())
                     .orElseThrow(()-> new EntityNotFoundException("Document with id '%s' not found"
                             .formatted(documentInput.getDocumentId())));
        } else {
            toDelete.set(false);
            FolderEntity folder = folderEntityRepository.findById(documentInput.getParentFolderId())
                    .orElseGet(() -> folderEntityRepository.findRootFolder()
                            .orElseThrow(() -> new EntityNotFoundException("Root Folder not found")));

            document = documentRepository.save(DocumentEntity.builder()
                    .parentFolder(folder)
                    .build());
        }

        MultipartFile file = documentInput.getFile();
        ingestToVectorStore(file, document, userId, toDelete.get());
        String url = s3Service.uploadFile(file);
        document.setUrl(url);
        document.setName(file.getOriginalFilename());
        document.setContentType(file.getContentType());

        if (toDelete.get()) {
            var newDocument = DocumentEntity.builder()
                    .url(document.getUrl())
                    .name(document.getName())
                    .contentType(document.getContentType())
                    .parentFolder(document.getParentFolder())
                    .build();
            documentRepository.save(newDocument);
            document = newDocument;
        }

        return document;
    }

    private void ingestToVectorStore(MultipartFile file, DocumentEntity documentEntity, String userId, boolean toDelete) {
        String filename = file.getOriginalFilename();
        if (filename == null) {
            throw new IllegalArgumentException("Failed processing file without filename");
        }

        try (InputStream inputStream = file.getInputStream()) {
            byte[] fileBytes = inputStream.readAllBytes();
            String contentType = tika.detect(fileBytes);
            String extractedText = tika.parseToString(new ByteArrayInputStream(fileBytes));

            if (extractedText != null && !extractedText.trim().isEmpty()) {
                Document document = new Document(extractedText, Map.of(
                        DOCUMENT_ID, documentEntity.getId(),
                        USER_ID, userId,
                        FILENAME, filename,
                        CONTENT_TYPE, contentType
                ));

                if (toDelete) {
                    deleteDocument(documentEntity); // remove old embeddings + file
                }
                List<Document> chunks = textSplitter.apply(List.of(document));
                documentVectorStore.add(chunks);
            }
        } catch (IOException | TikaException e) {
            log.warn("Failed to ingest file {}: {}", filename, e.getMessage());
        }
    }

    private void deleteDocument(DocumentEntity document) {
        documentVectorStore.delete("%s == '%s'".formatted(DOCUMENT_ID, document.getId()));
        s3Service.deleteFile(document.getUrl());
        documentRepository.delete(document);
    }

    @Transactional
    public void deleteDocuments(List<UUID> ids) {
        for (UUID id : ids) {
            DocumentEntity document = documentRepository.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Failed to find document with id: " + id));
            deleteDocument(document);
        }
    }
}
