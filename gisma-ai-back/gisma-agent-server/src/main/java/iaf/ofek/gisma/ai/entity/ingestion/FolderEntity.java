package iaf.ofek.gisma.ai.entity.ingestion;

import com.fasterxml.jackson.annotation.JsonBackReference;
import iaf.ofek.gisma.ai.entity.GismaAiEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.HashSet;
import java.util.Set;

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
    private Set<FolderEntity> childrenFolders = new HashSet<>();

    @OneToMany(mappedBy = "parentFolder", cascade = CascadeType.ALL)
    private Set<DocumentEntity> childrenDocuments = new HashSet<>();

}