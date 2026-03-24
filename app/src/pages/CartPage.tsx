import { useNavigate } from 'react-router-dom';
import Cart from '../components/Cart';
import { useAppContext } from '../context/AppContext';

export default function CartPage() {
  const navigate = useNavigate();
  const {
    cartItems, selectedAddress, cartDeliveryMethod, setCartDeliveryMethod,
    handleIncreaseQuantity, handleDecreaseQuantity, handleRemoveItem,
    clearCartItems, setIsMenuOpen,
  } = useAppContext();

  return (
    <Cart
      cartItems={cartItems}
      onOpenMenu={() => { setIsMenuOpen(true); }}
      onGoToCatalog={() => navigate('/')}
      selectedAddress={selectedAddress}
      onOpenStoreAddresses={() => navigate('/addresses')}
      deliveryMethod={cartDeliveryMethod}
      setDeliveryMethod={setCartDeliveryMethod}
      onIncreaseQuantity={handleIncreaseQuantity}
      onDecreaseQuantity={handleDecreaseQuantity}
      onRemoveItem={handleRemoveItem}
      onClearCart={clearCartItems}
      onOpenMyOrders={() => navigate('/orders')}
    />
  );
}
