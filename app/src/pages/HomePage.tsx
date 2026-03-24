import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import SearchBar from '../components/SearchBar';
import PromoBanner from '../components/PromoBanner';
import CategoryTabs from '../components/CategoryTabs';
import ProductGrid from '../components/ProductGrid';
import BottomButton from '../components/BottomButton';
import { useAppContext } from '../context/AppContext';
import { PromoBannerDTO, createPromoBanner } from '../api/client';

export default function HomePage() {
  const {
    products, promoBanners, loadPromoBanners, cartItems,
    userInfo, initData, setIsMenuOpen,
  } = useAppContext();
  const navigate = useNavigate();

  const [activeCategory, setActiveCategory] = useState<string[]>(['all']);
  const [searchQuery, setSearchQuery] = useState('');
  const [isBottomButtonVisible, setIsBottomButtonVisible] = useState(false);

  const uniqueCategories = useMemo(() => {
    const categories = products
      .map(p => p.category)
      .filter((cat): cat is string => Boolean(cat));
    return Array.from(new Set(categories));
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = products;
    if (!activeCategory.includes('all')) {
      result = result.filter(p => p.category && activeCategory.includes(p.category));
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(p => p.title.toLowerCase().includes(query));
    }
    return result;
  }, [products, activeCategory, searchQuery]);

  const handleCategoryToggle = (category: string) => {
    if (category === 'all') {
      setActiveCategory(['all']);
    } else {
      setActiveCategory(prev => {
        const isSelected = prev.includes(category);
        if (isSelected) {
          const newSelection = prev.filter(cat => cat !== category);
          return newSelection.length === 0 ? ['all'] : newSelection;
        }
        return [...prev.filter(cat => cat !== 'all'), category];
      });
    }
  };

  // Reset category to 'all' when products change
  useEffect(() => {
    setActiveCategory(['all']);
  }, [products]);

  // Callback ref with IntersectionObserver for BottomButton visibility
  const productGridRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.2) {
            setIsBottomButtonVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.2 }
    );
    observer.observe(node);
  }, []);

  const handleAddPromoBanner = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) { alert('Размер файла не должен превышать 5MB'); return; }
      if (!file.type.startsWith('image/')) { alert('Файл должен быть изображением'); return; }
      try {
        if (!initData) { alert('Ошибка авторизации. Перезапустите приложение.'); return; }
        await createPromoBanner(file, initData);
        await loadPromoBanners();
        alert('Промо-баннер успешно создан!');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
        alert(`Не удалось создать промо-баннер: ${errorMessage}`);
      }
    };
    input.click();
  };

  const handleBannerClick = (banner: PromoBannerDTO) => {
    if (!banner.link) return;
    const product = products.find(p => p.id === banner.link);
    if (product) navigate(`/product/${product.id}`);
  };

  const handleEditBanner = (banner: PromoBannerDTO) => {
    navigate(`/admin/banner/${banner.id}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <AppHeader
        title="FanFanTulpan"
        actionType="menu-text"
        onAction={() => setIsMenuOpen(true)}
      />
      <SearchBar onSearchChange={setSearchQuery} />
      <PromoBanner
        banners={promoBanners}
        isAdminMode={userInfo?.mode === 'ADMIN'}
        onAddNew={handleAddPromoBanner}
        onEdit={handleEditBanner}
        onBannerClick={handleBannerClick}
      />
      <CategoryTabs
        categories={uniqueCategories}
        activeCategory={activeCategory}
        onCategoryChange={handleCategoryToggle}
      />
      <div ref={productGridRef}>
        <ProductGrid
          products={filteredProducts}
          onProductClick={(product) => navigate(`/product/${product.id}`)}
          isAdminMode={userInfo?.mode === 'ADMIN'}
          onAddNewCard={() => navigate('/admin/product/new')}
        />
      </div>
      {isBottomButtonVisible && (
        <div className="sticky bottom-0 z-10 mt-4 opacity-70">
          <BottomButton
            cartItemCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
            onClick={() => navigate('/cart')}
          />
        </div>
      )}
    </div>
  );
}
