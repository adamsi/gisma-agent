package iaf.ofek.sigma.ai.service.ingestion;

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

@Component
@Slf4j
public class DocumentProcessor {

    public static final String USER_ID = "userId";

    private static final Tika tika = new Tika();

    private static final TextSplitter textSplitter = new TokenTextSplitter();

    private final VectorStore documentVectorStore;

    public DocumentProcessor(@Qualifier("documentVectorStore") VectorStore documentVectorStore) {
        this.documentVectorStore = documentVectorStore;
    }

    @Async
    public void processFile(MultipartFile file, String userId) {
        String filename = file.getOriginalFilename();

        try (InputStream inputStream = file.getInputStream()) {
            byte[] fileBytes = inputStream.readAllBytes();
            String contentType = tika.detect(fileBytes);
            String extractedText = tika.parseToString(new ByteArrayInputStream(fileBytes));

            if (extractedText != null && !extractedText.trim().isEmpty()) {
                Document document = new Document(extractedText);
                document.getMetadata().put(USER_ID, userId);
                document.getMetadata().put("filename", filename);
                document.getMetadata().put("contentType", contentType);
                List<Document> chunks = textSplitter.apply(List.of(document));
                documentVectorStore.add(chunks);
            }
        } catch (IOException | TikaException ignored) {
        }
    }

}
