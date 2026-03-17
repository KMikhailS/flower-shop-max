import { useCallback } from 'react';

interface CartServerItem {
  good_id: number;
  count: number;
  name: string;
  price: number;
  image_url: string | null;
}

interface UseCartPersistenceReturn {
  saveCart: (items: { good_id: number; count: number }[]) => Promise<void>;
  loadCart: () => Promise<CartServerItem[] | null>;
  clearCart: () => Promise<void>;
}

export const useCartPersistence = (initData: string): UseCartPersistenceReturn => {

  const saveCart = useCallback(async (items: { good_id: number; count: number }[]) => {
    if (!initData) return;
    try {
      const response = await fetch('/api/cart', {
        method: 'PUT',
        headers: { 'Authorization': `tma ${initData}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });
      if (!response.ok) {
        console.error('Cart save failed:', response.status);
      }
    } catch (e) {
      console.error('Cart save error:', e);
    }
  }, [initData]);

  const loadCart = useCallback(async (): Promise<CartServerItem[] | null> => {
    if (!initData) return null;
    try {
      const response = await fetch('/api/cart', {
        headers: { 'Authorization': `tma ${initData}` }
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data.items || [];
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
