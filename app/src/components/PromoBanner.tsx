import React, { useState, useEffect } from 'react';
import { PromoBannerDTO } from '../api/client';
import AdminAddPromoBanner from './AdminAddPromoBanner';

interface PromoBannerProps {
  banners: PromoBannerDTO[];
  isAdminMode?: boolean;
  onAddNew?: () => void;
  onEdit?: (banner: PromoBannerDTO) => void;
  onBannerClick?: (banner: PromoBannerDTO) => void;
}

const PromoBanner: React.FC<PromoBannerProps> = ({ banners, isAdminMode, onAddNew, onEdit, onBannerClick }) => {
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  // В админ-режиме добавляем виртуальный слайд для карточки "добавить"
  const hasAddSlide = isAdminMode && onAddNew;
  const totalSlides = banners.length + (hasAddSlide ? 1 : 0);
  const isAddSlide = hasAddSlide && currentBannerIndex === totalSlides - 1;

  // Функции навигации по стрелкам
  const handlePrevBanner = () => {
    setCurrentBannerIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const handleNextBanner = () => {
    setCurrentBannerIndex((prev) => (prev + 1) % totalSlides);
  };

  // Автоматическая смена баннеров каждые 5 секунд
  // ВАЖНО: useEffect должен быть ДО любых условных returns (правило React hooks)
  useEffect(() => {
    if (banners.length <= 1) return; // Не нужен интервал для одного баннера

    const interval = setInterval(() => {
      // Авто-прокрутка только по реальным баннерам, не на слайд добавления
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }, 5000);

    return () => clearInterval(interval); // Очистка при unmount
  }, [banners.length]);

  // If no banners, handle early returns
  // ВАЖНО: Все условные returns должны быть ПОСЛЕ всех hooks
  if (totalSlides === 0) {
    return null;
  }

  const currentBanner = isAddSlide ? null : banners[currentBannerIndex];

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      // Swipe left - next slide
      setCurrentBannerIndex((prev) => (prev + 1) % totalSlides);
    } else if (isRightSwipe) {
      // Swipe right - previous slide
      setCurrentBannerIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
    }

    // Reset touch positions
    setTouchStart(0);
    setTouchEnd(0);
  };

  const handleBannerClick = () => {
    // Only trigger click if banner has a link and we're not in admin mode
    if (currentBanner && currentBanner.link && onBannerClick) {
      onBannerClick(currentBanner);
    }
  };

  return (
    <div className="space-y-2">
      <div
        className="relative h-[187px] overflow-hidden rounded-[20px]"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {isAddSlide ? (
          <AdminAddPromoBanner onClick={onAddNew!} />
        ) : (
          <>
            <img
              src={currentBanner!.image_url}
              alt="Promo Banner"
              className={`w-full h-full object-cover ${currentBanner!.link ? 'cursor-pointer' : ''}`}
              onClick={handleBannerClick}
            />
            <div className="absolute top-4 left-5">
              <div className="bg-green rounded-[30px] px-4 py-2 inline-block">
                <span className="text-white font-raleway text-xs font-medium">Акция</span>
              </div>
            </div>

            {/* Status Badge - показываем только для BLOCKED баннеров */}
            {currentBanner!.status === 'BLOCKED' && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-medium bg-opacity-90 text-white text-sm font-semibold px-4 py-2 rounded-full">
                Не активна
              </div>
            )}

            {/* Edit Button - only show for ADMIN */}
            {isAdminMode && onEdit && (
              <div className="absolute top-4 right-5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(currentBanner!);
                  }}
                  className="w-[50px] h-[50px] rounded-full bg-[#80D1C1] flex items-center justify-center shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              </div>
            )}
          </>
        )}

        {/* Navigation Arrows - only show if multiple slides */}
        {totalSlides > 1 && (
          <>
            <button
              onClick={handlePrevBanner}
              className="absolute top-1/2 left-2 -translate-y-1/2 w-[50px] h-[50px] flex items-center justify-center text-gray-300 hover:text-white transition-colors"
            >
              <svg width="20" height="36" viewBox="0 0 20 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                <mask id="mask0_banner_left" style={{maskType: "alpha"}} maskUnits="userSpaceOnUse" x="-15" y="-9" width="51" height="52">
                  <rect x="-14.8155" y="-8.4654" width="50.7937" height="50.7937" fill="#D9D9D9"/>
                </mask>
                <g mask="url(#mask0_banner_left)">
                  <path d="M5.7672 17.9638L19.2064 31.403C19.7355 31.9321 19.9912 32.5494 19.9735 33.2548C19.9559 33.9603 19.6825 34.5776 19.1534 35.1067C18.6243 35.6358 18.0071 35.9003 17.3016 35.9003C16.5961 35.9003 15.9788 35.6358 15.4497 35.1067L1.26984 20.9797C0.846561 20.5564 0.529101 20.0802 0.31746 19.5511C0.10582 19.022 0 18.4929 0 17.9638C0 17.4347 0.10582 16.9056 0.31746 16.3765C0.529101 15.8474 0.846561 15.3712 1.26984 14.9479L15.4497 0.768049C15.9788 0.238948 16.6049 -0.0167833 17.328 0.000853389C18.0511 0.0184901 18.6772 0.291858 19.2064 0.820959C19.7355 1.35006 20 1.96734 20 2.67281C20 3.37828 19.7355 3.99556 19.2064 4.52466L5.7672 17.9638Z" fill="currentColor"/>
                </g>
              </svg>
            </button>
            <button
              onClick={handleNextBanner}
              className="absolute top-1/2 right-2 -translate-y-1/2 w-[50px] h-[50px] flex items-center justify-center text-gray-300 hover:text-white transition-colors"
            >
              <svg width="20" height="36" viewBox="0 0 20 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                <mask id="mask0_banner_right" style={{maskType: "alpha"}} maskUnits="userSpaceOnUse" x="-16" y="-9" width="51" height="52">
                  <rect width="50" height="50" transform="matrix(-1.01587 0 0 1.01587 34.8155 -8.4654)" fill="#D9D9D9"/>
                </mask>
                <g mask="url(#mask0_banner_right)">
                  <path d="M14.2328 17.9638L0.793649 31.403C0.26455 31.9321 0.00881619 32.5494 0.0264544 33.2548C0.0440906 33.9603 0.317458 34.5776 0.84656 35.1067C1.37566 35.6358 1.99294 35.9003 2.69841 35.9003C3.40388 35.9003 4.02116 35.6358 4.55026 35.1067L18.7302 20.9797C19.1534 20.5564 19.4709 20.0802 19.6825 19.5511C19.8942 19.022 20 18.4929 20 17.9638C20 17.4347 19.8942 16.9056 19.6825 16.3765C19.4709 15.8474 19.1534 15.3712 18.7302 14.9479L4.55026 0.768049C4.02116 0.238948 3.39506 -0.0167833 2.67196 0.000853389C1.94885 0.0184901 1.32275 0.291858 0.793649 0.820959C0.26455 1.35006 -1.93762e-06 1.96734 -1.93762e-06 2.67281C-1.93762e-06 3.37828 0.26455 3.99556 0.793649 4.52466L14.2328 17.9638Z" fill="currentColor"/>
                </g>
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Pagination dots - only show if multiple slides */}
      {totalSlides > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalSlides }).map((_, index) => (
            <div
              key={index}
              className={`rounded-full transition-all ${
                index === currentBannerIndex
                  ? 'w-2.5 h-2.5 bg-[#898989]'
                  : 'w-2 h-2 bg-[#FFF5F5]'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PromoBanner;
