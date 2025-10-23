package iaf.ofek.gisma.ai.service.ingestion;

import iaf.ofek.gisma.ai.dto.DocumentDTO;
import lombok.extern.slf4j.Slf4j;
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

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

@Component
@Slf4j
public class DocumentProcessor {

    public static final String USER_ID = "userId";

    public static final String FILENAME = "filename";

    public static final String CONTENT_TYPE = "contentType";

    public static final String DOCUMENT_ID = "documentId";

    private static final Tika tika = new Tika();

    private static final TextSplitter textSplitter = new TokenTextSplitter();

    private final VectorStore documentVectorStore;

    public DocumentProcessor(@Qualifier("documentVectorStore") VectorStore documentVectorStore) {
        this.documentVectorStore = documentVectorStore;
    }

    @Async
    public CompletableFuture<DocumentDTO> processFile(DocumentDTO documentInput, String userId) {
        String documentId = documentInput.getDocumentId();

        if (documentId == null) {
            documentId = UUID.randomUUID().toString();
            documentInput.setDocumentId(documentId);
        }

        MultipartFile file = documentInput.getFile();
        String filename = file.getOriginalFilename();

        if (filename == null) {
            throw new IllegalArgumentException("failed processing file without filename");
        }

        try (InputStream inputStream = file.getInputStream()) {
            byte[] fileBytes = inputStream.readAllBytes();
            String contentType = tika.detect(fileBytes);
            String extractedText = tika.parseToString(new ByteArrayInputStream(fileBytes));

            if (extractedText != null && !extractedText.trim().isEmpty()) {
                Document document = new Document(extractedText, Map.of(
                        DOCUMENT_ID, documentId, USER_ID, userId,
                        FILENAME, filename, CONTENT_TYPE, contentType
                ));
                List<Document> chunks = textSplitter.apply(List.of(document));
                documentVectorStore.add(chunks);
                documentVectorStore.delete("%s == %s".formatted(DOCUMENT_ID, documentId));
            }
        } catch (IOException | TikaException ignored) {
        }

        return CompletableFuture.completedFuture(documentInput);
    }

}
