package iaf.ofek.sigma.ai.controller;

import iaf.ofek.sigma.ai.service.ingestion.IngestionService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final IngestionService ingestionService;

    @PostMapping("/upload")
    public void upload(@RequestParam("files") List<MultipartFile> files) {
        ingestionService.processFiles(files);
    }

}
