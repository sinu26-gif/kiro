'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem } from '@/types/database';

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getSubtotalPaisa: () => number;
  getTotalItems: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        set((state) => {
          // Check if item with same set_type_id already exists
          const existing = state.items.find((i) => i.set_type_id === item.set_type_id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.set_type_id === item.set_type_id
                  ? {
                      ...i,
                      set_quantity: i.set_quantity + item.set_quantity,
                      line_total_paisa: (i.set_quantity + item.set_quantity) * i.unit_price_paisa,
                    }
                  : i,
              ),
            };
          }
          return { items: [...state.items, item] };
        });
      },

      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        }));
      },

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id
              ? { ...i, set_quantity: quantity, line_total_paisa: quantity * i.unit_price_paisa }
              : i,
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      getSubtotalPaisa: () => {
        return get().items.reduce((sum, item) => sum + item.line_total_paisa, 0);
      },

      getTotalItems: () => {
        return get().items.reduce((sum, item) => sum + item.set_quantity, 0);
      },
    }),
    {
      name: 'himova-cart',
    },
  ),
);
