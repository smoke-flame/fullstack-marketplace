import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@marketplace/contracts/models/user';

interface UserState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;
}

const initialState: UserState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  loading: false,
  initialized: false,
  error: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ user: User; accessToken: string; refreshToken: string }>) {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.loading = false;
      state.error = null;
    },
    updateAccessToken(state, action: PayloadAction<string>) {
      state.accessToken = action.payload;
    },
    updateRefreshToken(state, action: PayloadAction<string>) {
      state.refreshToken = action.payload;
    },
    logout(state) {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.loading = false;
      state.error = null;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setInitialized(state, action: PayloadAction<boolean>) {
      state.initialized = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
  },
});

export const { setCredentials, updateAccessToken, updateRefreshToken, logout, setLoading, setInitialized, setError } = userSlice.actions;

export default userSlice;
