import { useParams, Navigate, useNavigate } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { useAppContext } from '../context/AppContext';

export default function ProductCardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    products, cartItems, userInfo,
    handleAddToCart, handleRemoveFromCart,
  } = useAppContext();

  const product = products.find(p => p.id === Number(id));

  // Products not loaded yet
  if (products.length === 0) {
    return <div className="flex items-center justify-center h-screen">Загрузка...</div>;
  }

  if (!product) {
    return <Navigate to="/" replace />;
  }

  return (
    <ProductCard
      product={product}
      onClose={() => navigate(-1)}
      onOpenCart={() => navigate('/cart')}
      onAddToCart={handleAddToCart}
      onRemoveFromCart={handleRemoveFromCart}
      cartItems={cartItems}
      userInfo={userInfo ?? undefined}
      onEdit={() => navigate(`/admin/product/${product.id}`)}
    />
  );
}
