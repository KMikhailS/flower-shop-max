import { useCallback } from 'react';

interface CartServerItem {
  good_id: number;
  count: number;
  name: string;
  price: number;
  image_url: string | null;
}

interface CartServerResponse {
  items: CartServerItem[];
  delivery_method: string | null;
  selected_address: string | null;
}

interface SaveCartParams {
  items: { good_id: number; count: number }[];
  delivery_method?: string;
  selected_address?: string;
}

interface UseCartPersistenceReturn {
  saveCart: (params: SaveCartParams) => Promise<void>;
  loadCart: () => Promise<CartServerResponse | null>;
  clearCart: () => Promise<void>;
}

export const useCartPersistence = (initData: string): UseCartPersistenceReturn => {

  const saveCart = useCallback(async (params: SaveCartParams) => {
    if (!initData) return;
    try {
      const response = await fetch('/api/cart', {
        method: 'PUT',
        headers: { 'Authorization': `tma ${initData}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      if (!response.ok) {
        console.error('Cart save failed:', response.status);
      }
    } catch (e) {
      console.error('Cart save error:', e);
    }
  }, [initData]);

  const loadCart = useCallback(async (): Promise<CartServerResponse | null> => {
    if (!initData) return null;
    try {
      const response = await fetch('/api/cart', {
        headers: { 'Authorization': `tma ${initData}` }
      });
      if (!response.ok) return null;
      const data = await response.json();
      return {
        items: data.items || [],
        delivery_method: data.delivery_method || null,
        selected_address: data.selected_address || null,
      };
    } catch (e) {
      console.error('Cart load error:', e);
      return null;
    }
  }, [initData]);

  const clearCart = useCallback(async () => {
    if (!initData) return;
    try {
      await fetch('/api/cart', {
        method: 'DELETE',
        headers: { 'Authorization': `tma ${initData}` }
      });
    } catch (e) {
      console.error('Cart clear error:', e);
    }
  }, [initData]);

  return { saveCart, loadCart, clearCart };
};
