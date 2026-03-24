import { createContext, useContext } from 'react';
import { Product } from '../components/ProductGrid';
import { CartItemData } from '../App';
import { UserInfo, PromoBannerDTO } from '../api/client';

export interface AppContextType {
  // WebApp
  webApp: MaxWebApp | null;
  initData: string;

  // User
  userInfo: UserInfo | null;
  setUserInfo: React.Dispatch<React.SetStateAction<UserInfo | null>>;

  // Products
  products: Product[];
  loadProducts: () => Promise<void>;

  // Promo banners
  promoBanners: PromoBannerDTO[];
  loadPromoBanners: () => Promise<void>;

  // Cart
  cartItems: CartItemData[];
  setCartItems: React.Dispatch<React.SetStateAction<CartItemData[]>>;
  handleAddToCart: (product: Product) => void;
  handleRemoveFromCart: (productId: number) => void;
  handleIncreaseQuantity: (productId: number) => void;
  handleDecreaseQuantity: (productId: number) => void;
  handleRemoveItem: (productId: number) => void;
  clearCartItems: () => void;

  // Address & delivery
  selectedAddress: string;
  setSelectedAddress: (address: string) => void;
  cartDeliveryMethod: 'pickup' | 'delivery';
  setCartDeliveryMethod: (method: 'pickup' | 'delivery') => void;

  // Menu
  isMenuOpen: boolean;
  setIsMenuOpen: (open: boolean) => void;
}

export const AppContext = createContext<AppContextType | null>(null);

export function useAppContext(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppContext.Provider');
  }
  return context;
}
