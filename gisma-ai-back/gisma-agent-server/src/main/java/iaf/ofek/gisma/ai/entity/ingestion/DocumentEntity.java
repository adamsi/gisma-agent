package iaf.ofek.gisma.ai.entity.ingestion;

import com.fasterxml.jackson.annotation.JsonBackReference;
import iaf.ofek.gisma.ai.entity.GismaAiEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "documents")
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentEntity extends GismaAiEntity {

    private String url;

    private String name;

    @Column(name = "content_type")
    private String contentType;

    @ManyToOne
    @JoinColumn(name = "folder_id")
    @JsonBackReference(value = "folder-document")
    private FolderEntity parentFolder;

}
