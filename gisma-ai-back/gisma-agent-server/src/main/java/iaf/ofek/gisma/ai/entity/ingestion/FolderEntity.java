package iaf.ofek.gisma.ai.entity.ingestion;

import com.fasterxml.jackson.annotation.JsonBackReference;
import iaf.ofek.gisma.ai.entity.GismaAiEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "folders")
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FolderEntity extends GismaAiEntity {

    @Column
    private String name;

    @ManyToOne
    @JoinColumn(name = "parent_id")
    @JsonBackReference(value = "folder-folder")
    private FolderEntity parentFolder;

    @OneToMany(mappedBy = "parentFolder", cascade = CascadeType.ALL)
    private List<FolderEntity> childrenFolders = new ArrayList<>();

    @OneToMany(mappedBy = "parentFolder", cascade = CascadeType.ALL)
    private List<DocumentEntity> childrenDocuments = new ArrayList<>();

}