package iaf.ofek.gisma.ai.entity.ingestion;

import com.fasterxml.jackson.annotation.JsonIgnore;
import iaf.ofek.gisma.ai.entity.GismaAiEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.util.List;

@Entity
@Table(name = "folders")
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
public class FolderEntity extends GismaAiEntity {

    private String name;

    @ManyToOne
    @JoinColumn(name = "parent_id")
    @JsonIgnore
    private FolderEntity parentFolder;

    @OneToMany(mappedBy = "parentFolder", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<FolderEntity> childrenFolders;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "folder_id")
    private List<DocumentEntity> childrenDocuments;

}