import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api, handleAxiosError } from '@/utils/api';

interface UploadState {
  uploading: boolean;
  uploadProgress: number;
  uploadedFiles: string[];
  error: string | null;
  success: string | null;
}

const initialState: UploadState = {
  uploading: false,
  uploadProgress: 0,
  uploadedFiles: [],
  error: null,
  success: null,
};

export const uploadFiles = createAsyncThunk(
  'upload/uploadFiles',
  async (files: File[], { rejectWithValue }) => {
    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });

      const response = await api.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        withCredentials: true,
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          );
          // Progress will be handled in the component via the thunk
        },
      });

      return response.data;
    } catch (error) {
      return rejectWithValue(handleAxiosError(error));
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
  },
  extraReducers: (builder) => {
    builder
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
        // Add uploaded file names to the list
        if (Array.isArray(action.payload)) {
          state.uploadedFiles = [...state.uploadedFiles, ...action.payload];
        }
      })
      .addCase(uploadFiles.rejected, (state, action) => {
        state.uploading = false;
        state.uploadProgress = 0;
        state.error = action.payload as string;
        state.success = null;
      });
  },
});

export const { clearError, clearSuccess, clearUploadState, setUploadProgress } = uploadSlice.actions;
export default uploadSlice.reducer;
