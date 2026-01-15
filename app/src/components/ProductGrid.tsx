import React from 'react';
import AdminAddCard from './AdminAddCard';
import ProductGridCard from './ProductGridCard';

export interface Product {
  id: number;
  image: string;
  images?: string[];
  alt: string;
  title: string;
  price: string;
  non_discount_price?: string;
  description: string;
  category?: string;
  status?: string;
  sort_order?: number;
}

interface ProductGridProps {
  products: Product[];
  onProductClick?: (product: Product) => void;
  isAdminMode?: boolean;
  onAddNewCard?: () => void;
}

const ProductGrid: React.FC<ProductGridProps> = ({ products, onProductClick, isAdminMode, onAddNewCard }) => {
  return (
    <div className="grid grid-cols-2 gap-[21px] px-8">
      {products.map((product, index) => (
        <ProductGridCard
          key={product.id}
          product={product}
          onClick={() => onProductClick?.(product)}
          isPriority={index < 4}
        />
      ))}
      {isAdminMode && onAddNewCard && (
        <AdminAddCard onClick={onAddNewCard} />
      )}
    </div>
  );
};

export default ProductGrid;
