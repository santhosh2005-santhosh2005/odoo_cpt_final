// store/orderSlice.ts
import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export interface OrderItem {
  lineId: string;
  productId: string;
  name: string;
  size: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  discount?: number;
  taxRate?: number;
  isFreeFromPromotion?: boolean;
}

interface AppliedPromotion {
  id: string;
  name: string;
  discountAmount: number;
  type: string;
}

interface OrderState {
  items: OrderItem[];
  totalPrice: number;
  appliedPromotions: AppliedPromotion[];
  availablePromotions: any[];
}

const initialState: OrderState = {
  items: [],
  totalPrice: 0,
  appliedPromotions: [],
  availablePromotions: [],
};

const cartSlice = createSlice({
  name: "order",
  initialState,
  reducers: {
    addItem: (state, action: PayloadAction<Omit<OrderItem, "lineId">>) => {
      // Generate a unique lineId for this item
      const lineId = `${action.payload.productId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      state.items.push({ ...action.payload, lineId, quantity: 1 });

      // Recalculate total price
      state.totalPrice = state.items.reduce(
        (sum, item) => {
          if (item.isFreeFromPromotion) return sum;
          return sum + (item.price * (1 - (item.discount || 0) / 100)) * item.quantity;
        },
        0
      );
    },

    removeItem: (
      state,
      action: PayloadAction<{ lineId: string }>
    ) => {
      state.items = state.items.filter((item) => item.lineId !== action.payload.lineId);

      state.totalPrice = state.items.reduce(
        (sum, item) => {
          if (item.isFreeFromPromotion) return sum;
          return sum + (item.price * (1 - (item.discount || 0) / 100)) * item.quantity;
        },
        0
      );
    },

    clearCart: (state) => {
      state.items = [];
      state.totalPrice = 0;
    },

    setCart: (state, action: PayloadAction<OrderItem[]>) => {
      state.items = action.payload;
      state.totalPrice = state.items.reduce(
        (sum, item) => {
          if (item.isFreeFromPromotion) return sum;
          return sum + (item.price * (1 - (item.discount || 0) / 100)) * item.quantity;
        },
        0
      );
    },

    updateQuantity: (
      state,
      action: PayloadAction<{
        lineId: string;
        quantity: number;
      }>
    ) => {
      const { lineId, quantity } = action.payload;
      const item = state.items.find((i) => i.lineId === lineId);
      if (item) {
        item.quantity = quantity;
      }

      state.totalPrice = state.items.reduce(
        (sum, item) => {
          if (item.isFreeFromPromotion) return sum;
          return sum + (item.price * (1 - (item.discount || 0) / 100)) * item.quantity;
        },
        0
      );
    },

    updateItemField: (
      state,
      action: PayloadAction<{
        lineId: string;
        field: "quantity" | "price" | "discount" | "isFreeFromPromotion";
        value: any;
      }>
    ) => {
      const { lineId, field, value } = action.payload;
      const item = state.items.find((i) => i.lineId === lineId);
      if (item) {
        (item as any)[field] = value;
      }

      state.totalPrice = state.items.reduce(
        (sum, item) => {
          if (item.isFreeFromPromotion) return sum;
          return sum + (item.price * (1 - (item.discount || 0) / 100)) * item.quantity;
        },
        0
      );
    },
    applyPromotion: (state, action: PayloadAction<AppliedPromotion>) => {
      state.appliedPromotions = [...state.appliedPromotions, action.payload];
    },
    removePromotion: (state, action: PayloadAction<{ id: string }>) => {
      state.appliedPromotions = state.appliedPromotions.filter(p => p.id !== action.payload.id);
      // Also remove any free items from this promotion
      state.items = state.items.filter(item => !item.isFreeFromPromotion || !item.productId.includes(action.payload.id));
    },
    clearPromotions: (state) => {
      state.appliedPromotions = [];
      state.items = state.items.filter(item => !item.isFreeFromPromotion);
    },
    setAvailablePromotions: (state, action: PayloadAction<any[]>) => {
      state.availablePromotions = action.payload;
    },
  },
});

export const { 
  addItem, 
  removeItem, 
  clearCart, 
  updateQuantity, 
  updateItemField, 
  setCart, 
  applyPromotion, 
  removePromotion, 
  clearPromotions, 
  setAvailablePromotions 
} = cartSlice.actions;
export default cartSlice.reducer;
