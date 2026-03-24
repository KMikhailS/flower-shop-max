import React, { useState } from 'react';
import { CartItemData } from '../App';
import { UserInfo } from '../api/client';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';

interface Product {
  id: number;
  image: string;
  images?: string[];
  alt: string;
  title: string;
  price: string;
  non_discount_price?: string;
  description: string;
}

interface ProductCardProps {
  product: Product;
  onClose: () => void;
  onOpenCart: () => void;
  onAddToCart: (product: Product) => void;
  onRemoveFromCart: (productId: number) => void;
  cartItems: CartItemData[];
  userInfo?: UserInfo;
  onEdit?: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onOpenCart, onAddToCart, onRemoveFromCart, cartItems, userInfo, onEdit }) => {
  // Вычисляем общее количество товаров в корзине
  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Находим количество данного товара в корзине
  const productInCart = cartItems.find(item => item.product.id === product.id);
  const productQuantity = productInCart?.quantity || 0;

  useLockBodyScroll(true);

  // Состояние для навигации по изображениям
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Состояние для отслеживания touch events
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Получаем массив изображений (или используем основное изображение)
  const images = product.images && product.images.length > 0 ? product.images : [product.image];

  const handlePrevImage = () => {
    setCurrentImageIndex(prev => prev === 0 ? images.length - 1 : prev - 1);
  };

  const handleNextImage = () => {
    setCurrentImageIndex(prev => prev === images.length - 1 ? 0 : prev + 1);
  };

  // Минимальное расстояние для срабатывания свайпа (в пикселях)
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      handleNextImage();
    } else if (isRightSwipe) {
      handlePrevImage();
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-50 max-w-[402px] mx-auto overflow-y-auto">
      <div className="min-h-full flex flex-col">
        {/* Product Image Section */}
        <div
          className="relative h-[505px] flex-shrink-0"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <img
            src={images[currentImageIndex]}
            alt={product.alt}
            className="w-full h-full object-cover rounded-b-[30px]"
          />

          {/* Back Button */}
          {/*<button*/}
          {/*  onClick={onClose}*/}
          {/*  className="absolute top-12 left-9 w-[35px] h-[35px] flex items-center justify-center"*/}
          {/*>*/}
          {/*  <img src="/images/back-button.svg" alt="Back" className="w-full h-full" />*/}
          {/*</button>*/}

          {/* Edit Button (only for ADMIN) */}
          {userInfo?.mode === 'ADMIN' && onEdit && (
            <div className="absolute top-[42px] right-[105px]">
              <button
                onClick={onEdit}
                className="w-[66px] h-[66px] rounded-full bg-[#80D1C1] flex items-center justify-center shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            </div>
          )}

          {/* Cart Icon with Badge */}
          <div className="absolute top-[42px] right-[25px]">
            <button
              onClick={onOpenCart}
              className="relative w-[66px] h-[66px] rounded-full bg-[#80D1C1] flex items-center justify-center shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 16 16"><path fill="#000000" d="M14 13.1V12H4.6l.6-1.1l9.2-.9L16 4H3.7L3 1H0v1h2.2l2.1 8.4L3 13v1.5c0 .8.7 1.5 1.5 1.5S6 15.3 6 14.5S5.3 13 4.5 13H12v1.5c0 .8.7 1.5 1.5 1.5s1.5-.7 1.5-1.5c0-.7-.4-1.2-1-1.4z"/></svg>
              {cartItemCount > 0 && (
                <div className="absolute top-[7px] right-[11px] w-[15px] h-[15px] rounded-full bg-[#FF0000] flex items-center justify-center">
                  <span className="text-white text-[10px] font-normal leading-[1.21]">{cartItemCount}</span>
                </div>
              )}
            </button>
          </div>

          {/* Navigation Arrows - only show if there are multiple images */}
          {images.length > 1 && (
            <>
              <button
                onClick={handlePrevImage}
                className="absolute top-[245px] left-2 w-[50px] h-[50px] flex items-center justify-center text-gray-300 hover:text-white transition-colors"
              >
                <svg width="20" height="36" viewBox="0 0 20 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <mask id="mask0_3_85" style={{maskType: "alpha"}} maskUnits="userSpaceOnUse" x="-15" y="-9" width="51" height="52">
                    <rect x="-14.8155" y="-8.4654" width="50.7937" height="50.7937" fill="#D9D9D9"/>
                  </mask>
                  <g mask="url(#mask0_3_85)">
                    <path d="M5.7672 17.9638L19.2064 31.403C19.7355 31.9321 19.9912 32.5494 19.9735 33.2548C19.9559 33.9603 19.6825 34.5776 19.1534 35.1067C18.6243 35.6358 18.0071 35.9003 17.3016 35.9003C16.5961 35.9003 15.9788 35.6358 15.4497 35.1067L1.26984 20.9797C0.846561 20.5564 0.529101 20.0802 0.31746 19.5511C0.10582 19.022 0 18.4929 0 17.9638C0 17.4347 0.10582 16.9056 0.31746 16.3765C0.529101 15.8474 0.846561 15.3712 1.26984 14.9479L15.4497 0.768049C15.9788 0.238948 16.6049 -0.0167833 17.328 0.000853389C18.0511 0.0184901 18.6772 0.291858 19.2064 0.820959C19.7355 1.35006 20 1.96734 20 2.67281C20 3.37828 19.7355 3.99556 19.2064 4.52466L5.7672 17.9638Z" fill="currentColor"/>
                  </g>
                </svg>
              </button>
              <button
                onClick={handleNextImage}
                className="absolute top-[245px] right-2 w-[50px] h-[50px] flex items-center justify-center text-gray-300 hover:text-white transition-colors"
              >
                <svg width="20" height="36" viewBox="0 0 20 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <mask id="mask0_3_88" style={{maskType: "alpha"}} maskUnits="userSpaceOnUse" x="-16" y="-9" width="51" height="52">
                    <rect width="50" height="50" transform="matrix(-1.01587 0 0 1.01587 34.8155 -8.4654)" fill="#D9D9D9"/>
                  </mask>
                  <g mask="url(#mask0_3_88)">
                    <path d="M14.2328 17.9638L0.793649 31.403C0.26455 31.9321 0.00881619 32.5494 0.0264544 33.2548C0.0440906 33.9603 0.317458 34.5776 0.84656 35.1067C1.37566 35.6358 1.99294 35.9003 2.69841 35.9003C3.40388 35.9003 4.02116 35.6358 4.55026 35.1067L18.7302 20.9797C19.1534 20.5564 19.4709 20.0802 19.6825 19.5511C19.8942 19.022 20 18.4929 20 17.9638C20 17.4347 19.8942 16.9056 19.6825 16.3765C19.4709 15.8474 19.1534 15.3712 18.7302 14.9479L4.55026 0.768049C4.02116 0.238948 3.39506 -0.0167833 2.67196 0.000853389C1.94885 0.0184901 1.32275 0.291858 0.793649 0.820959C0.26455 1.35006 -1.93762e-06 1.96734 -1.93762e-06 2.67281C-1.93762e-06 3.37828 0.26455 3.99556 0.793649 4.52466L14.2328 17.9638Z" fill="currentColor"/>
                  </g>
                </svg>
              </button>
            </>
          )}

          {/* Pagination Dots */}
          <div className="absolute bottom-[43px] left-1/2 transform -translate-x-1/2 flex gap-5">
            {images.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === currentImageIndex ? 'bg-[#898989]' : 'bg-[#FFF5F5]'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Product Details Section */}
        <div className="px-8 pt-6 pb-4">
          {/* Title and Price */}
          <div className="flex items-start justify-between mb-3">
            <h2 className="text-base font-semibold leading-[1.174] text-black max-w-[184px]">
              {product.title}
            </h2>
            <div className="flex flex-col items-end gap-1">
              {product.non_discount_price && (
                <p className="text-sm font-normal leading-[1.174] text-gray-medium line-through">
                  {product.non_discount_price}
                </p>
              )}
              <p className="text-xl font-bold leading-[1.174] text-black">
                {product.price}
              </p>
            </div>
          </div>

          {/* Description */}
          <p className="text-base font-normal leading-[1.174] text-black mb-4">
            {product.description}
          </p>

          {/* Product ID for ADMIN */}
          {userInfo?.mode === 'ADMIN' && (
            <p className="text-sm font-normal leading-[1.174] text-gray-medium mb-4">
              ID: {product.id}
            </p>
          )}
        </div>

        {/* Spacer for fixed buttons */}
        <div className="h-[90px] flex-shrink-0"></div>

        {/* Action Buttons - fixed to bottom */}
        <div className="fixed bottom-0 left-0 right-0 max-w-[402px] mx-auto flex gap-[10px] px-4 pb-4 pt-2 bg-white z-10">
          <button
            onClick={() => {
              onAddToCart(product);
              onOpenCart();
            }}
            className="w-[180px] h-[55px] bg-[#80D1C1] rounded-[30px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] flex items-center justify-center"
          >
            <span className="text-sm font-semibold leading-[1.174] text-black">Купить сейчас</span>
          </button>
          {productQuantity > 0 ? (
            <div className="w-[180px] h-[55px] bg-[#80D1C1] rounded-[30px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] flex items-center justify-between px-4">
              <button
                onClick={() => onRemoveFromCart(product.id)}
                className="w-[32px] h-[32px] rounded-full bg-white/30 flex items-center justify-center"
              >
                <span className="text-lg font-medium text-black/70">−</span>
              </button>
              <div className="flex flex-col items-center">
                <span className="text-lg font-bold text-black">{productQuantity}</span>
                <span className="text-[11px] font-medium text-black/70 leading-none">В корзине</span>
              </div>
              <button
                onClick={() => onAddToCart(product)}
                className="w-[32px] h-[32px] rounded-full bg-white/30 flex items-center justify-center"
              >
                <span className="text-lg font-medium text-black/70">+</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => onAddToCart(product)}
              className="w-[180px] h-[55px] bg-[#80D1C1] rounded-[30px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] flex items-center justify-center"
            >
              <span className="text-sm font-semibold leading-[1.174] text-black">Добавить в корзину</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
