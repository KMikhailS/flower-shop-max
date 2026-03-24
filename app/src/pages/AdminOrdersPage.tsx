import AdminOrders from '../components/AdminOrders';
import { useAppContext } from '../context/AppContext';

export default function AdminOrdersPage() {
  const { initData, setIsMenuOpen } = useAppContext();

  return (
    <AdminOrders
      onMenuClick={() => { setIsMenuOpen(true); }}
      initData={initData}
    />
  );
}
