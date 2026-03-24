import { Routes, Route } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import HomePage from './pages/HomePage';
import ProductCardPage from './pages/ProductCardPage';
import CartPage from './pages/CartPage';
import StoreAddressesPage from './pages/StoreAddressesPage';
import DeliveryInfoPage from './pages/DeliveryInfoPage';
import PaymentInfoPage from './pages/PaymentInfoPage';
import SettingsPage from './pages/SettingsPage';
import MyOrdersPage from './pages/MyOrdersPage';
import AdminOrdersPage from './pages/AdminOrdersPage';
import AdminProductCardPage from './pages/AdminProductCardPage';
import AdminBannerCardPage from './pages/AdminBannerCardPage';

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="product/:id" element={<ProductCardPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="addresses" element={<StoreAddressesPage />} />
        <Route path="delivery" element={<DeliveryInfoPage />} />
        <Route path="payment" element={<PaymentInfoPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="orders" element={<MyOrdersPage />} />
        <Route path="admin/orders" element={<AdminOrdersPage />} />
        <Route path="admin/product/new" element={<AdminProductCardPage />} />
        <Route path="admin/product/:id" element={<AdminProductCardPage />} />
        <Route path="admin/banner/:id" element={<AdminBannerCardPage />} />
      </Route>
    </Routes>
  );
}
