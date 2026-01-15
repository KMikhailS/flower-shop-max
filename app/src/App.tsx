import { useState, useEffect, useMemo, useRef } from 'react';
import AppHeader from './components/AppHeader';
import SearchBar from './components/SearchBar';
import PromoBanner from './components/PromoBanner';
import CategoryTabs from './components/CategoryTabs';
import ProductGrid, { Product } from './components/ProductGrid';
import BottomButton from './components/BottomButton';
import MobileMenu from './components/MobileMenu';
import ProductCard from './components/ProductCard';
import Cart from './components/Cart';
import StoreAddresses from './components/StoreAddresses';
import DeliveryInfo from './components/DeliveryInfo';
import PaymentInfo from './components/PaymentInfo';
import Settings from './components/Settings';
import MyOrders from './components/MyOrders';
import AdminOrders from './components/AdminOrders';
import AdminProductCard from './components/AdminProductCard';
import AdminPromoBannerCard from './components/AdminPromoBannerCard';
import { useTelegramWebApp } from './hooks/useTelegramWebApp';
import { useCartPersistence } from './hooks/useCartPersistence';
import { fetchUserInfo, UserInfo, createGoodCard, fetchGoods, fetchAllGoods, GoodDTO, addGoodImages, updateGoodCard, deleteGood, blockGood, activateGood, fetchPromoBanners, fetchAllPromoBanners, PromoBannerDTO, createPromoBanner, deletePromoBanner, blockPromoBanner, activatePromoBanner, updatePromoBannerLink } from './api/client';

export interface CartItemData {
  product: Product;
  quantity: number;
}

function App() {
  const { webApp } = useTelegramWebApp();
  const { saveCart, loadCart, clearCart } = useCartPersistence(webApp);

  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [promoBanners, setPromoBanners] = useState<PromoBannerDTO[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isStoreAddressesOpen, setIsStoreAddressesOpen] = useState(false);
  const [isDeliveryInfoOpen, setIsDeliveryInfoOpen] = useState(false);
  const [isPaymentInfoOpen, setIsPaymentInfoOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMyOrdersOpen, setIsMyOrdersOpen] = useState(false);
  const [isAdminOrdersOpen, setIsAdminOrdersOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState('г. Тюмень ул. Пермякова, 62');
  const [previousScreen, setPreviousScreen] = useState<'home' | 'cart' | 'storeAddresses' | null>(null);
  const [previousScreenBeforeCart, setPreviousScreenBeforeCart] = useState<'home' | 'productCard' | null>(null);
  const [previousProduct, setPreviousProduct] = useState<Product | null>(null);
  const [returnToCart, setReturnToCart] = useState(false);
  const [isAdminCardOpen, setIsAdminCardOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAdminBannerCardOpen, setIsAdminBannerCardOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<PromoBannerDTO | null>(null);
  const [activeCategory, setActiveCategory] = useState<string[]>(['all']);
  const [searchQuery, setSearchQuery] = useState('');

  // Состояние корзины - теперь массив товаров
  const [cartItems, setCartItems] = useState<CartItemData[]>([]);
  const [cartDeliveryMethod, setCartDeliveryMethod] = useState<'pickup' | 'delivery'>('pickup');

  // Состояние для видимости кнопки корзины
  const [isBottomButtonVisible, setIsBottomButtonVisible] = useState(false);
  const productGridRef = useRef<HTMLDivElement>(null);

  // Extract unique categories from products
  const uniqueCategories = useMemo(() => {
    const categories = products
      .map(p => p.category)
      .filter((cat): cat is string => Boolean(cat));
    return Array.from(new Set(categories));
  }, [products]);

  // Filter products based on active categories and search query
  const filteredProducts = useMemo(() => {
    let result = products;

    // Filter by category
    if (!activeCategory.includes('all')) {
      result = result.filter(p => p.category && activeCategory.includes(p.category));
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(p => p.title.toLowerCase().includes(query));
    }

    return result;
  }, [products, activeCategory, searchQuery]);

  // Handle category toggle
  const handleCategoryToggle = (category: string) => {
    if (category === 'all') {
      // Clicking "Все" - clear all other selections, keep only "all"
      setActiveCategory(['all']);
    } else {
      setActiveCategory(prev => {
        const isSelected = prev.includes(category);

        if (isSelected) {
          // Category is already selected - remove it
          const newSelection = prev.filter(cat => cat !== category);

          // If nothing left, default to "all"
          if (newSelection.length === 0) {
            return ['all'];
          }

          return newSelection;
        } else {
          // Category is not selected - add it
          // Remove "all" if it was there, and add the new category
          const withoutAll = prev.filter(cat => cat !== 'all');
          return [...withoutAll, category];
        }
      });
    }
  };

  // Функции управления корзиной
  const handleAddToCart = (product: Product) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.product.id === product.id);

      if (existingItem) {
        // Если товар уже есть - увеличиваем quantity
        return prevItems.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        // Если товара нет - добавляем новый
        return [...prevItems, { product, quantity: 1 }];
      }
    });
  };

  const handleOpenCart = () => {
    // Определяем текущий экран перед открытием корзины
    if (selectedProduct) {
      setPreviousScreenBeforeCart('productCard');
      setPreviousProduct(selectedProduct); // Сохраняем продукт
    } else {
      setPreviousScreenBeforeCart('home');
      setPreviousProduct(null);
    }

    // Просто открываем корзину, не добавляем товар
    setIsCartOpen(true);
    setSelectedProduct(null);
  };

  const handleIncreaseQuantity = (productId: number) => {
    setCartItems(prevItems =>
      prevItems.map(item =>
        item.product.id === productId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  };

  const handleDecreaseQuantity = (productId: number) => {
    setCartItems(prevItems => {
      const item = prevItems.find(i => i.product.id === productId);

      // Если quantity = 1, ничего не делаем
      if (item && item.quantity <= 1) {
        return prevItems;
      }

      // Иначе уменьшаем quantity
      return prevItems.map(i =>
        i.product.id === productId
          ? { ...i, quantity: i.quantity - 1 }
          : i
      );
    });
  };

  const handleRemoveItem = (productId: number) => {
    setCartItems(prevItems => prevItems.filter(item => item.product.id !== productId));
  };

  // Уменьшает количество или удаляет товар при qty=1
  const handleRemoveFromCart = (productId: number) => {
    setCartItems(prevItems => {
      const item = prevItems.find(i => i.product.id === productId);
      if (!item) return prevItems;

      if (item.quantity <= 1) {
        // Удаляем товар из корзины
        return prevItems.filter(i => i.product.id !== productId);
      }

      // Уменьшаем количество
      return prevItems.map(i =>
        i.product.id === productId
          ? { ...i, quantity: i.quantity - 1 }
          : i
      );
    });
  };

  const handleOpenStoreAddresses = (fromCart: boolean = false) => {
    setReturnToCart(fromCart);
    if (fromCart) {
      setIsCartOpen(false);
    } else {
      setIsMenuOpen(false);
    }
    setIsStoreAddressesOpen(true);
  };

  const handleSelectAddress = (address: string) => {
    setSelectedAddress(address);
    setIsStoreAddressesOpen(false);
    if (returnToCart) {
      setIsCartOpen(true);
      setReturnToCart(false);
    }
  };

  const handleNavigateHome = () => {
    setIsMenuOpen(false);
    setSelectedProduct(null);
    setIsCartOpen(false);
    setIsStoreAddressesOpen(false);
    setIsSettingsOpen(false);
  };

  const handleCloseMenu = () => {
    setIsMenuOpen(false);
    if (previousScreen === 'cart') {
      setIsCartOpen(true);
    } else if (previousScreen === 'storeAddresses') {
      setIsStoreAddressesOpen(true);
    }
    setPreviousScreen(null);
  };

  const handleOpenSettings = () => {
    setIsMenuOpen(false);
    setIsSettingsOpen(true);
  };

  const handleCloseSettings = () => {
    setIsSettingsOpen(false);
  };

  const handleOpenDeliveryInfo = () => {
    setIsMenuOpen(false);
    setIsDeliveryInfoOpen(true);
  };

  const handleCloseDeliveryInfo = () => {
    setIsDeliveryInfoOpen(false);
  };

  const handleOpenPaymentInfo = () => {
    setIsMenuOpen(false);
    setIsPaymentInfoOpen(true);
  };

  const handleClosePaymentInfo = () => {
    setIsPaymentInfoOpen(false);
  };

  const handleOpenMyOrders = () => {
    setIsMenuOpen(false);
    setIsMyOrdersOpen(true);
  };

  const handleOpenAdminOrders = () => {
    setIsMenuOpen(false);
    setIsAdminOrdersOpen(true);
  };

  const handleSettingsModeChange = async () => {
    // Reload user info after mode change
    if (!webApp || !webApp.initData) return;

    try {
      const data = await fetchUserInfo(webApp.initData);
      setUserInfo(data);
      console.log('User info reloaded after mode change:', data);
    } catch (error) {
      console.error('Failed to reload user info:', error);
    }
  };

  const handleOpenAdminCard = () => {
    setEditingProduct(null);
    setIsAdminCardOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsAdminCardOpen(true);
    setSelectedProduct(null);
  };

  const handleDeleteProduct = async () => {
    if (!webApp || !webApp.initData || !editingProduct) {
      alert('Ошибка: недоступен Telegram WebApp или товар не выбран');
      return;
    }

    const confirmMessage = `Удалить товар "${editingProduct.title}"?`;

    const handleConfirmedDelete = async () => {
      try {
        await deleteGood(editingProduct.id, webApp.initData);

        const onSuccess = () => {
          setIsAdminCardOpen(false);
          setEditingProduct(null);
          loadProducts();
        };

        if (webApp?.showAlert) {
          webApp.showAlert('Товар успешно удалён', onSuccess);
        } else {
          alert('Товар успешно удалён');
          onSuccess();
        }
      } catch (error) {
        console.error('Failed to delete good:', error);
        if (webApp?.showAlert) {
          webApp.showAlert('Ошибка при удалении товара');
        } else {
          alert('Ошибка при удалении товара');
        }
      }
    };

    if (webApp?.showConfirm) {
      webApp.showConfirm(confirmMessage, (confirmed) => {
        if (!confirmed) return;
        handleConfirmedDelete();
      });
      return;
    }

    const confirmDelete = window.confirm(confirmMessage);
    if (!confirmDelete) return;
    await handleConfirmedDelete();
  };

  const handleToggleBlockProduct = async () => {
    if (!webApp || !webApp.initData || !editingProduct) {
      alert('Ошибка: недоступен Telegram WebApp или товар не выбран');
      return;
    }

    try {
      if (editingProduct.status === 'BLOCKED') {
        // Активируем товар
        await activateGood(editingProduct.id, webApp.initData);
        alert('Товар успешно активирован');
      } else {
        // Блокируем товар
        await blockGood(editingProduct.id, webApp.initData);
        alert('Товар успешно заблокирован');
      }
      setIsAdminCardOpen(false);
      setEditingProduct(null);
      await loadProducts();
    } catch (error) {
      console.error('Failed to toggle block status:', error);
      alert('Ошибка при изменении статуса товара');
    }
  };

  // Функция для загрузки акционных баннеров
  const loadPromoBanners = async () => {
    try {
      let banners: PromoBannerDTO[];

      // Если пользователь ADMIN - загружаем все баннеры, иначе только NEW
      if (userInfo?.mode === 'ADMIN' && webApp?.initData) {
        banners = await fetchAllPromoBanners(webApp.initData);
      } else {
        banners = await fetchPromoBanners();
      }

      setPromoBanners(banners);
    } catch (error) {
      console.error('Failed to fetch promo banners:', error);
      setPromoBanners([]);
    }
  };

  // Функция для добавления нового промо-баннера
  const handleAddPromoBanner = () => {
    // Create hidden file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];

      if (!file) return;

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Размер файла не должен превышать 5MB');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Файл должен быть изображением');
        return;
      }

      try {
        const initData = webApp?.initData || '';
        console.log('Creating promo banner with initData length:', initData.length);

        if (!initData) {
          console.error('No initData available');
          alert('Ошибка авторизации. Перезапустите приложение.');
          return;
        }

        const newBanner = await createPromoBanner(file, initData);
        console.log('Promo banner created:', newBanner);

        // Reload banners to show the new one
        await loadPromoBanners();
        alert('Промо-баннер успешно создан!');
      } catch (error) {
        console.error('Failed to create promo banner:', error);
        const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
        alert(`Не удалось создать промо-баннер: ${errorMessage}`);
      }
    };

    input.click();
  };

  // Обработчик клика по баннеру - открывает товар по link
  const handleBannerClick = (banner: PromoBannerDTO) => {
    if (!banner.link) return;

    const product = products.find(p => p.id === banner.link);
    if (product) {
      setSelectedProduct(product);
    }
  };

  // Обработчики для редактирования баннеров
  const handleEditBanner = (banner: PromoBannerDTO) => {
    setEditingBanner(banner);
    setIsAdminBannerCardOpen(true);
  };

  const handleDeleteBanner = async () => {
    if (!webApp || !webApp.initData || !editingBanner) {
      webApp?.showAlert?.('Ошибка: недоступен Telegram WebApp или баннер не выбран');
      return;
    }

    // Use Telegram WebApp native confirm dialog
    webApp.showConfirm('Удалить промо-баннер?', async (confirmed) => {
      if (!confirmed) return;

      try {
        await deletePromoBanner(editingBanner.id, webApp.initData);
        webApp.showAlert('Баннер успешно удалён', () => {
          setIsAdminBannerCardOpen(false);
          setEditingBanner(null);
          loadPromoBanners();
        });
      } catch (error) {
        console.error('Failed to delete banner:', error);
        webApp.showAlert(`Ошибка при удалении баннера:\n${error instanceof Error ? error.message : String(error)}`);
      }
    });
  };

  const handleToggleBlockBanner = async () => {
    if (!webApp || !webApp.initData || !editingBanner) {
      alert('Ошибка: недоступен Telegram WebApp или баннер не выбран');
      return;
    }

    try {
      if (editingBanner.status === 'BLOCKED') {
        // Активируем баннер
        await activatePromoBanner(editingBanner.id, webApp.initData);
        alert('Баннер успешно активирован');
      } else {
        // Блокируем баннер
        await blockPromoBanner(editingBanner.id, webApp.initData);
        alert('Баннер успешно заблокирован');
      }
      setIsAdminBannerCardOpen(false);
      setEditingBanner(null);
      await loadPromoBanners();
    } catch (error) {
      console.error('Failed to toggle block status:', error);
      alert('Ошибка при изменении статуса баннера');
    }
  };

  const handleSaveBanner = async (link: number | null) => {
    if (!webApp || !webApp.initData || !editingBanner) {
      alert('Ошибка: недоступен Telegram WebApp или баннер не выбран');
      return;
    }

    try {
      await updatePromoBannerLink(editingBanner.id, link, webApp.initData);
      setIsAdminBannerCardOpen(false);
      setEditingBanner(null);
      await loadPromoBanners();
      alert('Баннер успешно сохранён');
    } catch (error) {
      console.error('Failed to save banner:', error);
      alert('Ошибка при сохранении баннера');
    }
  };

  // Функция для загрузки товаров с бэкенда
  const loadProducts = async () => {
    try {
      let goods: GoodDTO[];

      // Если пользователь ADMIN - загружаем все товары, иначе только NEW
      if (userInfo?.mode === 'ADMIN' && webApp?.initData) {
        goods = await fetchAllGoods(webApp.initData);
      } else {
        goods = await fetchGoods();
      }

      const mappedProducts: Product[] = goods.map((good: GoodDTO) => {
        const sortedImages = (good.images || [])
          .sort((a, b) => a.display_order - b.display_order)
          .map(img => img.image_url);

        return {
          id: good.id,
          image: sortedImages[0] || '/images/placeholder.png',
          images: sortedImages,
          alt: good.name,
          title: good.name,
          price: `${good.price} руб.`,
          non_discount_price: good.non_discount_price ? `${good.non_discount_price} руб.` : undefined,
          description: good.description,
          category: good.category,
          status: good.status,
          sort_order: good.sort_order ?? good.id,
        };
      });

      mappedProducts.sort((a, b) => {
        const aOrder = a.sort_order ?? a.id;
        const bOrder = b.sort_order ?? b.id;
        return aOrder - bOrder;
      });

      setProducts(mappedProducts);
    } catch (error) {
      console.error('Failed to fetch goods:', error);
      console.error('Error details:', error instanceof Error ? error.message : String(error));
      // Показываем пустой массив товаров при ошибке
      setProducts([]);
    }
  };

  const handleSaveAdminCard = async (data: {
    id?: number;
    name: string;
    category: string;
    price: number;
    non_discount_price?: number;
    description: string;
    imageFiles: File[];
    sort_order?: number;
  }) => {
    if (!webApp || !webApp.initData) {
      alert('Ошибка: недоступен Telegram WebApp');
      return;
    }

    try {
      if (data.id) {
        // Обновляем существующий товар
        await updateGoodCard(
          data.id,
          {
            name: data.name,
            category: data.category,
            price: data.price,
            non_discount_price: data.non_discount_price,
            description: data.description,
            sort_order: data.sort_order,
          },
          webApp.initData
        );

        // Если есть новые изображения, загружаем их
        if (data.imageFiles.length > 0) {
          await addGoodImages(data.id, data.imageFiles, webApp.initData);
        }

        setIsAdminCardOpen(false);
        setEditingProduct(null);
        alert('Товар успешно обновлен!');
      } else {
        // Создаем новый товар
        const createdGood = await createGoodCard(
          {
            name: data.name,
            category: data.category,
            price: data.price,
            non_discount_price: data.non_discount_price,
            description: data.description,
            sort_order: data.sort_order,
          },
          webApp.initData
        );

        // Если есть изображения, загружаем их
        if (data.imageFiles.length > 0) {
          await addGoodImages(createdGood.id, data.imageFiles, webApp.initData);
        }

        setIsAdminCardOpen(false);
        alert('Товар успешно добавлен!');
      }

      // Обновляем список товаров
      await loadProducts();
    } catch (error) {
      console.error('Failed to save good card:', error);
      alert('Ошибка при сохранении товара. Проверьте права доступа.');
    }
  };

  // Восстановление корзины при инициализации
  useEffect(() => {
    if (!webApp) return;

    loadCart().then((savedCart) => {
      if (savedCart && savedCart.cartItems) {
        setCartItems(savedCart.cartItems);
        setSelectedAddress(savedCart.selectedAddress);
        setCartDeliveryMethod(savedCart.deliveryMethod);
      }
    });
  }, [webApp, loadCart]);

  // Получение информации о пользователе при инициализации
  useEffect(() => {
    if (!webApp || !webApp.initData) return;

    fetchUserInfo(webApp.initData)
      .then((data) => {
        setUserInfo(data);
        console.log('User info loaded:', data);
      })
      .catch((error) => {
        console.error('Failed to fetch user info:', error);
      });
  }, [webApp]);

  // Загрузка товаров при инициализации и при изменении режима пользователя
  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInfo?.mode]);

  // Загрузка акционных баннеров при инициализации и при изменении режима пользователя
  useEffect(() => {
    loadPromoBanners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInfo?.mode]);

  // Reset category to 'all' when products change
  useEffect(() => {
    setActiveCategory(['all']);
  }, [products]);

  // Intersection Observer для отслеживания видимости ProductGrid
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Показываем кнопку когда ProductGrid появился на экране на 20%
          if (entry.isIntersecting && entry.intersectionRatio >= 0.2) {
            setIsBottomButtonVisible(true);
          }
        });
      },
      {
        threshold: 0.2, // Срабатывает когда 20% элемента видно
      }
    );

    const currentRef = productGridRef.current;

    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []);

  // Автосохранение корзины при изменении состояния
  useEffect(() => {
    if (cartItems.length === 0) {
      clearCart(); // Очищаем storage при пустой корзине
      return;
    }

    saveCart({
      cartItems,
      deliveryMethod: cartDeliveryMethod,
      selectedAddress: selectedAddress,
      timestamp: new Date().toISOString(),
    });
  }, [cartItems, cartDeliveryMethod, selectedAddress, saveCart, clearCart]);

  // Управление BackButton Telegram
  useEffect(() => {
    if (!webApp) return;

    const isNotOnHome = isCartOpen || selectedProduct !== null || isStoreAddressesOpen || isDeliveryInfoOpen || isPaymentInfoOpen || isMenuOpen || isAdminCardOpen || isSettingsOpen || isMyOrdersOpen || isAdminOrdersOpen;

    if (isNotOnHome) {
      webApp.BackButton.show();

      const handleBackClick = () => {
        if (isCartOpen) {
          setIsCartOpen(false);
          // Восстанавливаем предыдущий экран
          if (previousScreenBeforeCart === 'productCard' && previousProduct) {
            setSelectedProduct(previousProduct); // Восстанавливаем продукт
            setPreviousProduct(null); // Очищаем сохраненный продукт
          }
          setPreviousScreenBeforeCart(null);
        } else if (selectedProduct) {
          setSelectedProduct(null);
        } else if (isAdminCardOpen) {
          setIsAdminCardOpen(false);
        } else if (isSettingsOpen) {
          setIsSettingsOpen(false);
        } else if (isMyOrdersOpen) {
          setIsMyOrdersOpen(false);
        } else if (isAdminOrdersOpen) {
          setIsAdminOrdersOpen(false);
        } else if (isDeliveryInfoOpen) {
          setIsDeliveryInfoOpen(false);
          setIsMenuOpen(true);
        } else if (isPaymentInfoOpen) {
          setIsPaymentInfoOpen(false);
          setIsMenuOpen(true);
        } else if (isStoreAddressesOpen) {
          setIsStoreAddressesOpen(false);
          if (returnToCart) {
            setIsCartOpen(true);
            setReturnToCart(false);
          }
        } else if (isMenuOpen) {
          handleCloseMenu();
        }
      };

      webApp.BackButton.onClick(handleBackClick);

      return () => {
        webApp.BackButton.offClick(handleBackClick);
      };
    } else {
      webApp.BackButton.hide();
    }
  }, [webApp, isCartOpen, selectedProduct, isStoreAddressesOpen, isDeliveryInfoOpen, isPaymentInfoOpen, isMenuOpen, isAdminCardOpen, isSettingsOpen, isMyOrdersOpen, isAdminOrdersOpen, returnToCart, cartItems, previousProduct, previousScreenBeforeCart]);

  return (
    <div className="min-h-screen bg-white max-w-[402px] mx-auto">
      <MobileMenu
        isOpen={isMenuOpen}
        onClose={handleCloseMenu}
        onOpenStoreAddresses={() => handleOpenStoreAddresses(false)}
        onOpenDeliveryInfo={handleOpenDeliveryInfo}
        onOpenPaymentInfo={handleOpenPaymentInfo}
        onOpenSettings={handleOpenSettings}
        onOpenMyOrders={handleOpenMyOrders}
        onOpenAdminOrders={handleOpenAdminOrders}
        onNavigateHome={handleNavigateHome}
        userRole={userInfo?.role}
      />
      <DeliveryInfo
        isOpen={isDeliveryInfoOpen}
        onClose={handleCloseDeliveryInfo}
      />
      <PaymentInfo
        isOpen={isPaymentInfoOpen}
        onClose={handleClosePaymentInfo}
      />
      <StoreAddresses
        isOpen={isStoreAddressesOpen}
        onSelectAddress={handleSelectAddress}
        onMenuClick={() => {
          setPreviousScreen('storeAddresses');
          setIsStoreAddressesOpen(false);
          setIsMenuOpen(true);
        }}
        userMode={userInfo?.mode}
        initData={webApp?.initData}
        fromCart={returnToCart}
      />
      <Settings
        isOpen={isSettingsOpen}
        onClose={handleCloseSettings}
        onMenuClick={() => {
          setIsSettingsOpen(false);
          setIsMenuOpen(true);
        }}
        userMode={userInfo?.mode}
        initData={webApp?.initData}
        onModeChange={handleSettingsModeChange}
      />
      <MyOrders
        isOpen={isMyOrdersOpen}
        onMenuClick={() => {
          setIsMyOrdersOpen(false);
          setIsMenuOpen(true);
        }}
        initData={webApp?.initData}
      />
      <AdminOrders
        isOpen={isAdminOrdersOpen}
        onMenuClick={() => {
          setIsAdminOrdersOpen(false);
          setIsMenuOpen(true);
        }}
        initData={webApp?.initData}
      />
      {isCartOpen && (
        <Cart
          cartItems={cartItems}
          onOpenMenu={() => {
            setPreviousScreen('cart');
            setIsCartOpen(false);
            setIsMenuOpen(true);
          }}
          selectedAddress={selectedAddress}
          onOpenStoreAddresses={() => handleOpenStoreAddresses(true)}
          deliveryMethod={cartDeliveryMethod}
          setDeliveryMethod={setCartDeliveryMethod}
          onIncreaseQuantity={handleIncreaseQuantity}
          onDecreaseQuantity={handleDecreaseQuantity}
          onRemoveItem={handleRemoveItem}
          onClearCart={() => {
            setCartItems([]);
            clearCart();
          }}
          onOpenMyOrders={() => {
            setIsCartOpen(false);
            setIsMyOrdersOpen(true);
          }}
        />
      )}
      {selectedProduct && !isCartOpen && (
        <ProductCard
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onOpenCart={handleOpenCart}
          onAddToCart={handleAddToCart}
          onRemoveFromCart={handleRemoveFromCart}
          cartItems={cartItems}
          userInfo={userInfo || undefined}
          onEdit={() => handleEditProduct(selectedProduct)}
        />
      )}
      {isAdminCardOpen && (
        <AdminProductCard
          onClose={() => {
            setIsAdminCardOpen(false);
            setEditingProduct(null);
          }}
          onSave={handleSaveAdminCard}
          editingProduct={editingProduct || undefined}
          onDelete={editingProduct ? handleDeleteProduct : undefined}
          onBlock={editingProduct ? handleToggleBlockProduct : undefined}
        />
      )}
      {isAdminBannerCardOpen && editingBanner && (
        <AdminPromoBannerCard
          banner={editingBanner}
          onClose={() => {
            setIsAdminBannerCardOpen(false);
            setEditingBanner(null);
          }}
          onDelete={handleDeleteBanner}
          onBlock={handleToggleBlockBanner}
          onSave={handleSaveBanner}
        />
      )}
      <div className="flex flex-col gap-4">
        <AppHeader
          title="FanFanTulpan"
          actionType="menu-text"
          onAction={() => {
            setPreviousScreen('home');
            setIsMenuOpen(true);
          }}
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
            onProductClick={setSelectedProduct}
            isAdminMode={userInfo?.mode === 'ADMIN'}
            onAddNewCard={handleOpenAdminCard}
          />
        </div>
        {isBottomButtonVisible && (
          <div className="sticky bottom-0 z-10 mt-4 opacity-70">
            <BottomButton
              cartItemCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
              onClick={handleOpenCart}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
