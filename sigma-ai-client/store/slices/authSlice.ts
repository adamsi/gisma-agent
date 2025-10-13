import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AxiosError } from 'axios';
import { api, handleAxiosError } from '@/utils/api';
import { LoginUserDto, RegisterUserDto, User } from '@/types/user';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
}

const initialState: AuthState = {
  user: null,
  isAdmin: false,
  loading: false,
  error: null,
};

export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async () => {
    try {
      const response = await api.post('/auth/refresh-token', {}, {withCredentials: true});
      
      return response.data;
    } catch (error) {
    }
  }
);


export const login = createAsyncThunk(
  'auth/login',
  async (userData: LoginUserDto, { dispatch, rejectWithValue }) => {
    try {
      await api.post('/auth/login', userData, { withCredentials: true });
      const user = await dispatch(getUser()).unwrap();

      return user;
    } catch (error) {
      return rejectWithValue(handleAxiosError(error));
    }
  }
);

export const getUser = createAsyncThunk(
  'auth/me',
  async (_, { rejectWithValue }) => {
    try {
      const userResponse = await api.get('/auth/me', {withCredentials: true});
   
      return userResponse.data;
    } catch (error) {
      return rejectWithValue(handleAxiosError(error));
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (userData: RegisterUserDto, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/signup', userData, {withCredentials: true});
      return response.data;
    } catch (error) {
      return rejectWithValue(handleAxiosError(error));
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/logout');

      return response.data;
    } catch (error) {
      return rejectWithValue(handleAxiosError(error));
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
    .addCase(login.pending, (state) => {
      state.loading = true;
      state.error = null;
  })
  .addCase(login.fulfilled, (state, action) => {
      state.loading = false;
      state.user = {...action.payload};
      state.isAdmin = state.user?.role === 'ADMIN';
  })
  .addCase(login.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
  })
  .addCase(logout.pending, (state) => {
      state.loading = true;
      state.error = null;
  })
  .addCase(logout.fulfilled, (state) => {
      state.loading = false;
      state.user = null;
      state.isAdmin=false;
  })
  .addCase(logout.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
  })
  .addCase(register.pending, (state) => {
      state.loading = true;
      state.error = null;
  })
  .addCase(register.fulfilled, (state) => {
      state.loading = false;
  })
  .addCase(register.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
  })
  .addCase(getUser.pending, (state) => {
      state.loading = true;
      state.error = null;
  })
  .addCase(getUser.fulfilled, (state, action) => {
      state.loading = false;
      state.user = {...action.payload};
      state.isAdmin = state.user?.role === 'ADMIN';
  })
  .addCase(getUser.rejected, (state, action) => {
      state.loading = false;
      state.isAdmin = false;
      state.error = action.payload as string;
  });
  },
});

export const { clearError, setLoading } = authSlice.actions;
export default authSlice.reducer; 