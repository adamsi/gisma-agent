package iaf.ofek.gisma.ai.service.ingestion;

import iaf.ofek.gisma.ai.dto.ingestion.CreateDocumentDTO;
import iaf.ofek.gisma.ai.entity.ingestion.S3Document;
import iaf.ofek.gisma.ai.service.auth.AuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;
import java.util.stream.IntStream;

@Service
@RequiredArgsConstructor
@Log4j2
public class DocumentProcessor {

    private final AuthService authService;

    private final DocumentService documentService;

    public List<S3Document> saveNewDocuments(List<MultipartFile> files, List<UUID> parentFolderIds, String userId) {
        if (files.size() != parentFolderIds.size()) {
            throw new IllegalArgumentException("Files and documentDTOs must have the same size");
        }

        List<CreateDocumentDTO> documents = IntStream.range(0, files.size())
                .mapToObj(i -> new CreateDocumentDTO(parentFolderIds.get(i), files.get(i)))
                .toList();

        return documentService.createNewDocuments(documents, userId);
    }

    public S3Document editDocument(MultipartFile file, UUID documentId, String userId) {
        return documentService.editDocument(file, documentId, userId);
    }

    public void deleteDocuments(List<UUID> ids) {
         documentService.deleteDocuments(ids);
    }

}
