import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const routeToTab: Record<string, string> = {
  '/': 'home',
  '/cart': 'cart',
  '/orders': 'orders',
  '/settings': 'settings',
};

export function useShopNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const activeTab = useMemo(() => {
    if (location.pathname.startsWith('/product/')) return 'home';
    if (location.pathname.startsWith('/admin/')) return 'admin';
    return routeToTab[location.pathname] ?? 'home';
  }, [location.pathname]);

  const openProduct = useCallback((id: number) => navigate(`/product/${id}`), [navigate]);
  const openCart = useCallback(() => navigate('/cart'), [navigate]);
  const openAddresses = useCallback(() => navigate('/addresses'), [navigate]);
  const openDelivery = useCallback(() => navigate('/delivery'), [navigate]);
  const openPayment = useCallback(() => navigate('/payment'), [navigate]);
  const openSettings = useCallback(() => navigate('/settings'), [navigate]);
  const openOrders = useCallback(() => navigate('/orders'), [navigate]);
  const openAdminOrders = useCallback(() => navigate('/admin/orders'), [navigate]);
  const openAdminProductNew = useCallback(() => navigate('/admin/product/new'), [navigate]);
  const openAdminProduct = useCallback((id: number) => navigate(`/admin/product/${id}`), [navigate]);
  const openAdminBanner = useCallback((id: number) => navigate(`/admin/banner/${id}`), [navigate]);
  const goHome = useCallback(() => navigate('/'), [navigate]);
  const goBack = useCallback(() => navigate(-1), [navigate]);

  return {
    activeTab,
    navigate,
    location,
    openProduct,
    openCart,
    openAddresses,
    openDelivery,
    openPayment,
    openSettings,
    openOrders,
    openAdminOrders,
    openAdminProductNew,
    openAdminProduct,
    openAdminBanner,
    goHome,
    goBack,
  };
}
