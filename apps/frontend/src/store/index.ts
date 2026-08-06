import { configureStore } from '@reduxjs/toolkit';
import authSlice from '@/modules/auth/userSlice';
import cartSlice from './cartSlice';

export const store = configureStore({
  reducer: {
    user: authSlice.reducer,
    cart: cartSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
