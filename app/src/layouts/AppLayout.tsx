import { useState, useEffect, useMemo, useCallback } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import MobileMenu from '../components/MobileMenu';
import { useMaxWebApp } from '../hooks/useMaxWebApp';
import { useCartPersistence } from '../hooks/useCartPersistence';
import { useBackButton } from '../hooks/useBackButton';
import { AppContext, AppContextType } from '../context/AppContext';
import { CartItemData } from '../App';
import { Product } from '../components/ProductGrid';
import {
  fetchUserInfo, UserInfo, fetchGoods, fetchAllGoods, GoodDTO,
  fetchPromoBanners, fetchAllPromoBanners, PromoBannerDTO,
  fetchSupportChatId
} from '../api/client';

export default function AppLayout() {
  const { webApp } = useMaxWebApp();
  const initData = webApp?.initData || '';
  const { saveCart, loadCart, clearCart } = useCartPersistence(initData);
  const navigate = useNavigate();
  const location = useLocation();

  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [promoBanners, setPromoBanners] = useState<PromoBannerDTO[]>([]);
  const [cartItems, setCartItems] = useState<CartItemData[]>([]);
  const [cartDeliveryMethod, setCartDeliveryMethod] = useState<'pickup' | 'delivery'>('pickup');
  const [selectedAddress, setSelectedAddress] = useState('г. Тюмень ул. Пермякова, 62');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // BackButton integration
  useBackButton(webApp);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Cart handlers
  const handleAddToCart = useCallback((product: Product) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const handleIncreaseQuantity = useCallback((productId: number) => {
    setCartItems(prev =>
      prev.map(item =>
        item.product.id === productId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  }, []);

  const handleDecreaseQuantity = useCallback((productId: number) => {
    setCartItems(prev => {
      const item = prev.find(i => i.product.id === productId);
      if (item && item.quantity <= 1) return prev;
      return prev.map(i =>
        i.product.id === productId
          ? { ...i, quantity: i.quantity - 1 }
          : i
      );
    });
  }, []);

  const handleRemoveItem = useCallback((productId: number) => {
    setCartItems(prev => prev.filter(item => item.product.id !== productId));
  }, []);

  const handleRemoveFromCart = useCallback((productId: number) => {
    setCartItems(prev => {
      const item = prev.find(i => i.product.id === productId);
      if (!item) return prev;
      if (item.quantity <= 1) {
        return prev.filter(i => i.product.id !== productId);
      }
      return prev.map(i =>
        i.product.id === productId
          ? { ...i, quantity: i.quantity - 1 }
          : i
      );
    });
  }, []);

  const clearCartItems = useCallback(() => {
    setCartItems([]);
    clearCart();
  }, [clearCart]);

  // Load products
  const loadProducts = useCallback(async () => {
    try {
      let goods: GoodDTO[];
      if (userInfo?.mode === 'ADMIN' && initData) {
        goods = await fetchAllGoods(initData);
      } else {
        goods = await fetchGoods();
      }
      const mapped: Product[] = goods.map((good: GoodDTO) => {
        const sortedImages = (good.images || [])
          .sort((a, b) => a.display_order - b.display_order)
          .map(img => img.image_url);
        return {
          id: good.id,
          image: sortedImages[0] || '/images/placeholder.png',
          images: sortedImages,
          alt: good.name,
          title: good.name,
          price: `${good.price} руб.`,
          non_discount_price: good.non_discount_price ? `${good.non_discount_price} руб.` : undefined,
          description: good.description,
          category: good.category,
          status: good.status,
          sort_order: good.sort_order ?? good.id,
        };
      });
      mapped.sort((a, b) => (a.sort_order ?? a.id) - (b.sort_order ?? b.id));
      setProducts(mapped);
    } catch (error) {
      console.error('Failed to fetch goods:', error);
      setProducts([]);
    }
  }, [userInfo?.mode, initData]);

  // Load promo banners
  const loadPromoBanners = useCallback(async () => {
    try {
      let banners: PromoBannerDTO[];
      if (userInfo?.mode === 'ADMIN' && initData) {
        banners = await fetchAllPromoBanners(initData);
      } else {
        banners = await fetchPromoBanners();
      }
      setPromoBanners(banners);
    } catch (error) {
      console.error('Failed to fetch promo banners:', error);
      setPromoBanners([]);
    }
  }, [userInfo?.mode, initData]);

  // Restore cart on init
  useEffect(() => {
    if (!webApp) return;
    loadCart().then((serverItems) => {
      if (serverItems && serverItems.length > 0) {
        setCartItems(serverItems.map(item => ({
          product: {
            id: item.good_id,
            image: item.image_url || '/images/placeholder.png',
            images: item.image_url ? [item.image_url] : [],
            alt: item.name,
            title: item.name,
            price: `${item.price} руб.`,
            description: '',
          },
          quantity: item.count
        })));
      }
    });
  }, [webApp, loadCart]);

  // Fetch user info on init
  useEffect(() => {
    if (!webApp || !initData) return;
    fetchUserInfo(initData)
      .then((data) => {
        setUserInfo(data);
      })
      .catch((error) => {
        console.error('Failed to fetch user info:', error);
      });
  }, [webApp, initData]);

  // Load products when user mode changes
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Load promo banners when user mode changes
  useEffect(() => {
    loadPromoBanners();
  }, [loadPromoBanners]);

  // Auto-save cart
  useEffect(() => {
    if (cartItems.length === 0) {
      clearCart();
      return;
    }
    saveCart(cartItems.map(item => ({ good_id: item.product.id, count: item.quantity })));
  }, [cartItems, saveCart, clearCart]);

  // Support chat / feedback handler
  const buildSupportChatLink = (chatId: string) => {
    const normalized = chatId.trim();
    if (!normalized) return null;
    if (/^https?:\/\//.test(normalized)) return { url: normalized, preferMax: true };
    if (normalized.startsWith('@')) return { url: `https://max.ru/${normalized.slice(1)}`, preferMax: true };
    if (/^-?\d+$/.test(normalized)) {
      if (normalized.startsWith('-100') && normalized.length > 4) {
        return { url: `https://max.ru/c/${normalized.slice(4)}/1`, preferMax: true };
      }
      return null;
    }
    return null;
  };

  const openSupportLink = (url: string, preferMax: boolean) => {
    if (preferMax && webApp?.openMaxLink) {
      try { webApp.openMaxLink(url); return true; } catch { /* ignore */ }
    }
    if (webApp?.openLink) {
      try { webApp.openLink(url); return true; } catch { /* ignore */ }
    }
    try { window.open(url, '_blank'); return true; } catch { /* ignore */ }
    return false;
  };

  const handleOpenFeedback = async () => {
    if (!initData) {
      alert('Ошибка: нет данных авторизации');
      return;
    }
    try {
      const supportChatId = await fetchSupportChatId(initData);
      if (!supportChatId) { window.alert('Чат поддержки не настроен'); return; }
      const chatLink = buildSupportChatLink(supportChatId);
      if (!chatLink) { window.alert('Неверный формат ID чата поддержки'); return; }
      const opened = openSupportLink(chatLink.url, chatLink.preferMax);
      if (!opened) { window.alert('Не удалось открыть чат поддержки'); return; }
      setIsMenuOpen(false);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      window.alert(msg.includes('404') ? 'Чат поддержки не настроен' : 'Не удалось открыть чат поддержки');
    }
  };

  // Menu navigation handlers
  const handleMenuClose = () => setIsMenuOpen(false);

  const handleSettingsModeChange = async () => {
    if (!initData) return;
    try {
      const data = await fetchUserInfo(initData);
      setUserInfo(data);
    } catch (error) {
      console.error('Failed to reload user info:', error);
    }
  };

  const contextValue: AppContextType = useMemo(() => ({
    webApp,
    initData,
    userInfo,
    setUserInfo,
    products,
    loadProducts,
    promoBanners,
    loadPromoBanners,
    cartItems,
    setCartItems,
    handleAddToCart,
    handleRemoveFromCart,
    handleIncreaseQuantity,
    handleDecreaseQuantity,
    handleRemoveItem,
    clearCartItems,
    selectedAddress,
    setSelectedAddress,
    cartDeliveryMethod,
    setCartDeliveryMethod,
    isMenuOpen,
    setIsMenuOpen,
  }), [
    webApp, initData, userInfo, products, loadProducts,
    promoBanners, loadPromoBanners, cartItems, handleAddToCart,
    handleRemoveFromCart, handleIncreaseQuantity, handleDecreaseQuantity,
    handleRemoveItem, clearCartItems, selectedAddress, cartDeliveryMethod,
    isMenuOpen,
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      <div className="min-h-screen bg-white max-w-[402px] mx-auto">
        <MobileMenu
          isOpen={isMenuOpen}
          onClose={handleMenuClose}
          onOpenStoreAddresses={() => { setIsMenuOpen(false); navigate('/addresses'); }}
          onOpenDeliveryInfo={() => { setIsMenuOpen(false); navigate('/delivery'); }}
          onOpenPaymentInfo={() => { setIsMenuOpen(false); navigate('/payment'); }}
          onOpenFeedback={handleOpenFeedback}
          onOpenSettings={() => { setIsMenuOpen(false); navigate('/settings'); }}
          onOpenMyOrders={() => { setIsMenuOpen(false); navigate('/orders'); }}
          onOpenAdminOrders={() => { setIsMenuOpen(false); navigate('/admin/orders'); }}
          onNavigateHome={() => { setIsMenuOpen(false); navigate('/'); }}
          userRole={userInfo?.role}
        />
        <Outlet context={{ handleSettingsModeChange }} />
      </div>
    </AppContext.Provider>
  );
}
