import MyOrders from '../components/MyOrders';
import { useAppContext } from '../context/AppContext';

export default function MyOrdersPage() {
  const { initData, setIsMenuOpen } = useAppContext();

  return (
    <MyOrders
      onMenuClick={() => { setIsMenuOpen(true); }}
      initData={initData}
    />
  );
}
