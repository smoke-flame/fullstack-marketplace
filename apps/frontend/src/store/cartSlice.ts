import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { CartItem } from '@marketplace/contracts/api/cart/cart';

export interface CartState {
  items: CartItem[];
}

const initialState: CartState = {
  items: [],
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    setCart(state, action: PayloadAction<CartItem[]>) {
      state.items = action.payload;
    },
    upsertItem(state, action: PayloadAction<CartItem>) {
      const existing = state.items.find((item) => item.productId === action.payload.productId);
      if (existing) {
        existing.qty = action.payload.qty;
        existing.snapshot = action.payload.snapshot;
        existing.priceChanged = action.payload.priceChanged;
        existing.unavailable = action.payload.unavailable;
      } else {
        state.items.push(action.payload);
      }
    },
    removeItem(state, action: PayloadAction<string>) {
      state.items = state.items.filter((item) => item.productId !== action.payload);
    },
    clearCart(state) {
      state.items = [];
    },
  },
});

export const { setCart, upsertItem, removeItem, clearCart } = cartSlice.actions;

export default cartSlice;
