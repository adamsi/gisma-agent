import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api, handleAxiosError } from '@/utils/api';
import { DocumentDTO, FolderDTO } from '@/types/ingestion';
import { FolderEntity, DocumentEntity } from '@/types/ingestion';

interface UploadState {
  uploading: boolean;
  uploadProgress: number;
  uploadedFiles: string[];
  error: string | null;
  success: string | null;
  rootFolder: FolderEntity | null;
  currentFolder: FolderEntity | null;
  loading: boolean;
}

const initialState: UploadState = {
  uploading: false,
  uploadProgress: 0,
  uploadedFiles: [],
  error: null,
  success: null,
  rootFolder: null,
  currentFolder: null,
  loading: false,
};

export const uploadFiles = createAsyncThunk(
  'upload/uploadFiles',
  async ({ files, parentFolderId }: { files: File[]; parentFolderId: string }, { rejectWithValue }) => {
    try {
      // Mock upload - simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock response - create DocumentEntity objects
      const mockDocuments = files.map(file => ({
        id: crypto.randomUUID(),
        name: file.name,
        url: `/documents/${file.name}`,
        contentType: file.type || 'application/octet-stream'
      }));
      
      return mockDocuments;
    } catch (error) {
      return rejectWithValue('Upload failed');
    }
  }
);

export const fetchRootFolder = createAsyncThunk(
  'upload/fetchRootFolder',
  async (_, { rejectWithValue }) => {
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Return mock root folder
      const mockRootFolder: FolderEntity = {
        id: 'root',
        name: '/',
        childrenFolders: [
          {
            id: 'folder1',
            name: 'Documents',
            childrenFolders: [
              {
                id: 'folder2',
                name: 'Reports',
                childrenDocuments: [
                  {
                    id: 'doc1',
                    name: 'Q4_Report.pdf',
                    url: '/documents/reports/Q4_Report.pdf',
                    contentType: 'application/pdf'
                  },
                  {
                    id: 'doc2',
                    name: 'Financial_Analysis.xlsx',
                    url: '/documents/reports/Financial_Analysis.xlsx',
                    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                  }
                ]
              },
              {
                id: 'folder3',
                name: 'Presentations',
                childrenDocuments: [
                  {
                    id: 'doc3',
                    name: 'Company_Overview.pptx',
                    url: '/documents/presentations/Company_Overview.pptx',
                    contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
                  }
                ]
              }
            ],
            childrenDocuments: [
              {
                id: 'doc4',
                name: 'README.md',
                url: '/documents/README.md',
                contentType: 'text/markdown'
              }
            ]
          },
          {
            id: 'folder4',
            name: 'Images',
            childrenDocuments: [
              {
                id: 'doc5',
                name: 'logo.png',
                url: '/images/logo.png',
                contentType: 'image/png'
              },
              {
                id: 'doc6',
                name: 'banner.jpg',
                url: '/images/banner.jpg',
                contentType: 'image/jpeg'
              }
            ]
          },
          {
            id: 'folder5',
            name: 'Code',
            childrenFolders: [
              {
                id: 'folder6',
                name: 'Frontend',
                childrenDocuments: [
                  {
                    id: 'doc7',
                    name: 'App.tsx',
                    url: '/code/frontend/App.tsx',
                    contentType: 'text/typescript'
                  }
                ]
              }
            ]
          }
        ],
        childrenDocuments: [
          {
            id: 'doc8',
            name: 'Welcome.txt',
            url: '/Welcome.txt',
            contentType: 'text/plain'
          }
        ]
      };
      
      return mockRootFolder;
    } catch (error) {
      return rejectWithValue('Failed to fetch folder structure');
    }
  }
);

export const createFolder = createAsyncThunk(
  'upload/createFolder',
  async (folderData: FolderDTO, { rejectWithValue }) => {
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock response
      const mockFolder: FolderEntity = {
        id: crypto.randomUUID(),
        name: folderData.name,
        childrenFolders: [],
        childrenDocuments: []
      };
      
      return mockFolder;
    } catch (error) {
      return rejectWithValue('Failed to create folder');
    }
  }
);

export const deleteItems = createAsyncThunk(
  'upload/deleteItems',
  async (ids: string[], { rejectWithValue }) => {
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return ids;
    } catch (error) {
      return rejectWithValue('Failed to delete items');
    }
  }
);

const uploadSlice = createSlice({
  name: 'upload',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSuccess: (state) => {
      state.success = null;
    },
    clearUploadState: (state) => {
      state.uploading = false;
      state.uploadProgress = 0;
      state.error = null;
      state.success = null;
    },
    setUploadProgress: (state, action: PayloadAction<number>) => {
      state.uploadProgress = action.payload;
    },
    setCurrentFolder: (state, action: PayloadAction<FolderEntity>) => {
      state.currentFolder = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Upload files
      .addCase(uploadFiles.pending, (state) => {
        state.uploading = true;
        state.uploadProgress = 0;
        state.error = null;
        state.success = null;
      })
      .addCase(uploadFiles.fulfilled, (state, action) => {
        state.uploading = false;
        state.uploadProgress = 100;
        state.success = 'Files uploaded successfully!';
        state.error = null;
        // Add uploaded files to the current folder for mock data
        if (state.currentFolder && Array.isArray(action.payload)) {
          if (!state.currentFolder.childrenDocuments) {
            state.currentFolder.childrenDocuments = [];
          }
          state.currentFolder.childrenDocuments.push(...action.payload);
          state.uploadedFiles = [...state.uploadedFiles, ...action.payload.map((doc: DocumentEntity) => doc.name)];
        }
      })
      .addCase(uploadFiles.rejected, (state, action) => {
        state.uploading = false;
        state.uploadProgress = 0;
        state.error = action.payload as string;
        state.success = null;
      })
      // Fetch root folder
      .addCase(fetchRootFolder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRootFolder.fulfilled, (state, action) => {
        state.loading = false;
        state.rootFolder = action.payload;
        state.currentFolder = action.payload;
        state.error = null;
      })
      .addCase(fetchRootFolder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create folder
      .addCase(createFolder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createFolder.fulfilled, (state, action) => {
        state.loading = false;
        state.success = 'Folder created successfully!';
        state.error = null;
        // For mock data, add the folder to the current folder's children
        if (state.currentFolder && state.currentFolder.childrenFolders) {
          state.currentFolder.childrenFolders.push(action.payload);
        }
      })
      .addCase(createFolder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Delete items
      .addCase(deleteItems.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteItems.fulfilled, (state, action) => {
        state.loading = false;
        state.success = `${action.payload.length} item(s) deleted successfully!`;
        state.error = null;
        // For mock data, remove items from current folder
        if (state.currentFolder) {
          if (state.currentFolder.childrenFolders) {
            state.currentFolder.childrenFolders = state.currentFolder.childrenFolders.filter(
              folder => !action.payload.includes(folder.id)
            );
          }
          if (state.currentFolder.childrenDocuments) {
            state.currentFolder.childrenDocuments = state.currentFolder.childrenDocuments.filter(
              doc => !action.payload.includes(doc.id)
            );
          }
        }
      })
      .addCase(deleteItems.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearSuccess, clearUploadState, setUploadProgress, setCurrentFolder } = uploadSlice.actions;
export default uploadSlice.reducer;
