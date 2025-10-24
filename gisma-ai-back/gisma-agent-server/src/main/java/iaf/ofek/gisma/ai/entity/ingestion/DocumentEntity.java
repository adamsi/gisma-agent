package iaf.ofek.gisma.ai.entity.ingestion;

import iaf.ofek.gisma.ai.entity.GismaAiEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "documents")
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
public class DocumentEntity extends GismaAiEntity {

    private String url;

    private String name;

    @Column(name = "content_type")
    private String contentType;

}
