package iaf.ofek.gisma.ai.service.ingestion;

import iaf.ofek.gisma.ai.dto.DocumentDTO;
import iaf.ofek.gisma.ai.entity.ingestion.DocumentEntity;
import iaf.ofek.gisma.ai.entity.ingestion.FolderEntity;
import iaf.ofek.gisma.ai.repository.DocumentEntityRepository;
import iaf.ofek.gisma.ai.util.ReactiveUtils;
import jakarta.transaction.Transactional;
import lombok.extern.log4j.Log4j2;
import org.apache.tika.Tika;
import org.apache.tika.exception.TikaException;
import org.springframework.ai.document.Document;
import org.springframework.ai.transformer.splitter.TextSplitter;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Component
@Log4j2
public class DocumentProcessor {

    public static final String USER_ID = "userId";

    public static final String FILENAME = "filename";

    public static final String CONTENT_TYPE = "contentType";

    public static final String DOCUMENT_ID = "documentId";

    private static final Tika tika = new Tika();

    private static final TextSplitter textSplitter = new TokenTextSplitter();

    private final VectorStore documentVectorStore;

    private final DocumentEntityRepository documentRepository;

    private final FolderEntityService folderService;

    private final S3Service s3Service;


    public DocumentProcessor(@Qualifier("documentVectorStore") VectorStore documentVectorStore,
                             DocumentEntityRepository documentRepository, FolderEntityService folderService,
                             S3Service s3Service) {
        this.documentVectorStore = documentVectorStore;
        this.documentRepository = documentRepository;
        this.s3Service = s3Service;
        this.folderService = folderService;
    }

    @Async
    public CompletableFuture<DocumentEntity> processFile(DocumentDTO documentInput, String userId) {
        DocumentEntity document = documentRepository.findById(documentInput.getDocumentId())
                .orElseGet(()-> {
                    FolderEntity folder = folderService.getFileParentFolder(documentInput.getParentFolderId());

                return DocumentEntity.builder()
                        .parentFolder(folder)
                        .build();
                });
        var file = documentInput.getFile();
        ingestToVectorStore(file, document, userId);
        String url = s3Service.uploadFile(file);
        document.setUrl(url); // insert or replace document url

        return CompletableFuture.completedFuture(document);
    }

    private void ingestToVectorStore(MultipartFile file, DocumentEntity documentEntity, String userId) {
        String filename = file.getOriginalFilename();

        if (filename == null) {
            throw new IllegalArgumentException("failed processing file without filename");
        }

        try (InputStream inputStream = file.getInputStream()) {
            var fileBytes = inputStream.readAllBytes();
            String contentType = tika.detect(fileBytes);
            String extractedText = tika.parseToString(new ByteArrayInputStream(fileBytes));

            if (extractedText != null && !extractedText.trim().isEmpty()) {
                var document = new Document(extractedText, Map.of(
                        DOCUMENT_ID, documentEntity.getId(), USER_ID, userId,
                        FILENAME, filename, CONTENT_TYPE, contentType
                ));
                deleteDocument(documentEntity);
                List<Document> chunks = textSplitter.apply(List.of(document));
                documentVectorStore.add(chunks);
            }
        } catch (IOException | TikaException exception) {
            log.warn("Failed ingesting file!");
        }

    }

    private void deleteDocument(DocumentEntity document) {
        documentVectorStore.delete("%s == %s".formatted(DOCUMENT_ID, document.getId()));
        s3Service.deleteFile(document.getUrl());
    }

    @Transactional
    public Mono<Void> deleteDocuments(List<DocumentEntity> documents) {
        return Flux.fromIterable(documents)
                .flatMap(document ->
                        ReactiveUtils.runBlockingAsync(() -> {
                            documentVectorStore.delete("%s == %s".formatted(DOCUMENT_ID, document.getId()));
                            documentRepository.deleteAll(documents);
                            s3Service.deleteFile(document.getUrl());
                            return true;
                        })
                )
                .then();
    }

}
