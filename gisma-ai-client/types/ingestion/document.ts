export interface DocumentDTO {
  documentId: string;
  parentFolderId: string;
  file: File;
}

export interface FolderDTO {
  name: string;
  parentFolderId?: string;
}