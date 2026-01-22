import React from 'react';
import AppHeader from './AppHeader';
import CartItem from './CartItem';
import { useTelegramWebApp } from '../hooks/useTelegramWebApp';
import { CartItemData } from '../App';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { useDebounce } from '../hooks/useDebounce';
import { createOrder, OrderRequest, fetchUserInfo, suggestAddress, AddressSuggestion, fetchDeliveryAmount, fetchWorkTime } from '../api/client';
import DeliveryDateTimeModal from './DeliveryDateTimeModal';

interface CartProps {
  cartItems: CartItemData[];
  onOpenMenu: () => void;
  selectedAddress: string;
  onOpenStoreAddresses: () => void;
  deliveryMethod: 'pickup' | 'delivery';
  setDeliveryMethod: (method: 'pickup' | 'delivery') => void;
  onIncreaseQuantity: (productId: number) => void;
  onDecreaseQuantity: (productId: number) => void;
  onRemoveItem: (productId: number) => void;
  onClearCart: () => void;
  onOpenMyOrders: () => void;
}

const Cart: React.FC<CartProps> = ({
  cartItems,
  onOpenMenu,
  selectedAddress,
  onOpenStoreAddresses,
  deliveryMethod,
  setDeliveryMethod,
  onIncreaseQuantity,
  onDecreaseQuantity,
  onRemoveItem,
  onClearCart,
  onOpenMyOrders
}) => {
  const { webApp, user } = useTelegramWebApp();
  const [customAddress, setCustomAddress] = React.useState('г Тюмень, ');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = React.useState(false);
  const [deliveryAmount, setDeliveryAmount] = React.useState<number>(0);
  const [deliveryDate, setDeliveryDate] = React.useState<string>('');
  const [deliveryTime, setDeliveryTime] = React.useState<string>('');
  const [isDeliveryDateTimeOpen, setIsDeliveryDateTimeOpen] = React.useState(false);
  const [workTimeFrom, setWorkTimeFrom] = React.useState<string>('');
  const [workTimeTo, setWorkTimeTo] = React.useState<string>('');

  const debouncedAddress = useDebounce(customAddress, 300);

  useLockBodyScroll(true);

  const formatDeliveryDate = (ymd: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
    if (!m) return ymd;
    return `${m[3]}.${m[2]}.${m[1]}`;
  };

  const openDeliveryDateTimeModal = (e?: React.SyntheticEvent) => {
    // Use pointerdown to avoid cases where the first tap is swallowed by WebView/keyboard after a swipe.
    e?.preventDefault();
    if (isDeliveryDateTimeOpen) return;
    try {
      const active = document.activeElement;
      if (active && active instanceof HTMLElement) active.blur();
    } catch {
      // ignore
    }
    setIsDeliveryDateTimeOpen(true);
    webApp?.HapticFeedback.selectionChanged();
  };

  // Fetch address suggestions when debounced address changes
  React.useEffect(() => {
    if (deliveryMethod !== 'delivery' || debouncedAddress.length < 3) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      setIsLoadingSuggestions(true);
      try {
        const result = await suggestAddress(debouncedAddress);
        setSuggestions(result);
      } catch (error) {
        console.error('Failed to fetch address suggestions:', error);
        setSuggestions([]);
      } finally {
        setIsLoadingSuggestions(false);
      }
    };

    fetchSuggestions();
  }, [debouncedAddress, deliveryMethod]);

  // Fetch delivery amount for courier delivery
  React.useEffect(() => {
    const initData = webApp?.initData || '';
    if (!initData) return;

    fetchDeliveryAmount(initData)
      .then((value) => {
        const parsed = parseFloat(String(value).replace(/[^\d]/g, '')) || 0;
        setDeliveryAmount(parsed);
      })
      .catch((error) => {
        console.error('Failed to fetch delivery amount:', error);
        setDeliveryAmount(0);
      });
  }, [webApp?.initData]);

  // Fetch work time settings for delivery time picker
  React.useEffect(() => {
    const initData = webApp?.initData || '';
    if (!initData) return;

    fetchWorkTime(initData)
      .then(({ work_time_from, work_time_to }) => {
        setWorkTimeFrom(work_time_from || '');
        setWorkTimeTo(work_time_to || '');
      })
      .catch((error) => {
        console.error('Failed to fetch work time:', error);
        // Fallback to 24/7 if settings are missing/unavailable
        setWorkTimeFrom('');
        setWorkTimeTo('');
      });
  }, [webApp?.initData]);

  // Рассчитываем общую сумму всех товаров
  const totalPrice = cartItems.reduce((sum, item) => {
    const basePrice = parseFloat(item.product.price.replace(/[^\d]/g, ''));
    return sum + (basePrice * item.quantity);
  }, 0);

  const deliveryCost = deliveryMethod === 'delivery' && cartItems.length > 0 ? deliveryAmount : 0;
  const totalPriceWithDelivery = totalPrice + deliveryCost;

  const handleDecrease = (productId: number) => {
    onDecreaseQuantity(productId);
    webApp?.HapticFeedback.impactOccurred('light');
  };

  const handleIncrease = (productId: number) => {
    onIncreaseQuantity(productId);
    webApp?.HapticFeedback.impactOccurred('light');
  };

  const handleRemove = (productId: number) => {
    onRemoveItem(productId);
    webApp?.HapticFeedback.notificationOccurred('warning');
  };

  const handleBuy = async () => {
    if (cartItems.length === 0) return;
    if (isSubmitting) return;

    // Валидация адреса доставки
    if (deliveryMethod === 'delivery' && !customAddress.trim()) {
      webApp?.HapticFeedback.notificationOccurred('error');
      webApp?.showAlert('Пожалуйста, введите адрес доставки');
      return;
    }

    // Валидация даты/времени доставки для курьера
    if (deliveryMethod === 'delivery' && (!deliveryDate || !deliveryTime)) {
      webApp?.HapticFeedback.notificationOccurred('error');
      webApp?.showAlert('Пожалуйста, выберите дату и время доставки');
      return;
    }

    // Проверяем наличие user
    if (!user) {
      webApp?.HapticFeedback.notificationOccurred('error');
      webApp?.showAlert('Ошибка: не удалось получить данные пользователя');
      return;
    }

    setIsSubmitting(true);
    webApp?.HapticFeedback.notificationOccurred('success');

    try {
      // Получаем initData для авторизации
      const initData = webApp?.initData || '';

      // Проверяем наличие контактных данных пользователя
      let userInfo = await fetchUserInfo(initData);
      
      // Если нет phone - запрашиваем телефон
      if (!userInfo.phone) {
        setIsSubmitting(false);
        
        // Показываем информационное сообщение
        const shouldRequestContact = await new Promise<boolean>((resolve) => {
          webApp?.showConfirm(
            'Для оформления заказа нам нужен ваш номер телефона. Поделиться контактом?',
            (confirmed) => resolve(confirmed)
          );
        });

        if (!shouldRequestContact) {
          webApp?.showAlert('Без контактных данных мы не сможем связаться с вами для оформления заказа');
          return;
        }

        // Запрашиваем контакт пользователя через Telegram
        if (webApp?.requestContact) {
          webApp.requestContact();
          
          // Показываем сообщение с инструкцией (БЕЗ колбэка)
          webApp?.showAlert(
            'Сейчас откроется чат с ботом. Пожалуйста, поделитесь своим контактом, нажав на кнопку.'
          );
          
          // Запускаем проверку обновления данных на верхнем уровне
          let attempts = 0;
          const maxAttempts = 15; // 15 попыток * 1 секунду = 15 секунд
          
          const checkInterval = setInterval(async () => {
            attempts++;
            
            try {
              // Проверяем, сохранился ли телефон
              const updatedUserInfo = await fetchUserInfo(initData);
              
              if (updatedUserInfo.phone) {
                clearInterval(checkInterval);
                // Haptic feedback перед показом сообщения
                webApp?.HapticFeedback.notificationOccurred('success');
                // Показываем успешное сообщение на верхнем уровне
                webApp?.showAlert(
                  '✅ Номер телефона получен! Теперь нажмите "Заказать" еще раз для оформления заказа.'
                );
              } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                webApp?.showAlert(
                  'Не удалось получить номер телефона. Пожалуйста, убедитесь, что вы поделились своим контактом в чате с ботом, затем нажмите "Заказать" еще раз.'
                );
              }
            } catch (error) {
              console.error('Failed to check updated user info:', error);
              if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
              }
            }
          }, 1000); // Проверяем каждую секунду
        } else {
          webApp?.showAlert('Ваш Telegram не поддерживает запрос контакта. Обновите приложение.');
        }
        return;
      }
      // Определяем тип доставки и адрес
      const delivery_type = deliveryMethod === 'pickup' ? 'PICK_UP' : 'COURIER';
      const delivery_address = deliveryMethod === 'pickup' ? selectedAddress : customAddress.trim();

      // Формируем данные заказа для бэкенда
      const orderRequest: OrderRequest = {
        status: 'NEW',
        user_id: user.id,
        delivery_type,
        delivery_address,
        delivery_date: delivery_type === 'COURIER' ? deliveryDate : undefined,
        delivery_time: delivery_type === 'COURIER' ? deliveryTime : undefined,
        cart_items: cartItems.map(item => ({
          good_id: item.product.id,
          count: item.quantity,
        })),
      };

      // Отправляем заказ на бэкенд
      const createdOrder = await createOrder(orderRequest, initData);

      console.log('Order created successfully:', createdOrder);

      // Отправляем данные боту для уведомления (опционально, для обратной совместимости)
      const botData = {
        order_id: createdOrder.id,
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username,
        },
        items: cartItems.map(item => ({
          id: item.product.id,
          title: item.product.title,
          price: parseFloat(item.product.price.replace(/[^\d]/g, '')),
          quantity: item.quantity,
        })),
          totalPrice: totalPriceWithDelivery,
        deliveryMethod: deliveryMethod === 'pickup' ? 'Самовывоз' : 'Курьером',
        address: delivery_address,
        deliveryDate: deliveryMethod === 'delivery' ? deliveryDate : null,
        deliveryTime: deliveryMethod === 'delivery' ? deliveryTime : null,
        timestamp: new Date().toISOString(),
      };

      if (webApp) {
        webApp.sendData(JSON.stringify(botData));
      }

      // Показываем сообщение об успехе с предложением перейти в "Мои заказы"
      webApp?.showConfirm(
        'Заказ успешно оформлен!\n\nИнформация о заказе в разделе Мои заказы. Перейти?',
        (confirmed) => {
          if (confirmed) {
            onOpenMyOrders();
          }
        }
      );

      // Очищаем корзину после успешной покупки
      onClearCart();
    } catch (error) {
      console.error('Failed to create order:', error);
      webApp?.HapticFeedback.notificationOccurred('error');
      webApp?.showAlert(`Ошибка при создании заказа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-50 max-w-[402px] mx-auto overflow-y-auto">
      <div className="min-h-full">
        <AppHeader
          title="FanFanTulpan"
          actionType="menu-text"
          onAction={onOpenMenu}
        />
        <div className="p-8 pt-6">
        {/* Cart Items */}
        {cartItems.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-lg font-medium text-[#A09CAB]">Ваша корзина пока пуста</p>
          </div>
        ) : (
          <>
            {cartItems.map((item) => {
              const itemTotalPrice = parseFloat(item.product.price.replace(/[^\d]/g, '')) * item.quantity;
              return (
                <CartItem
                  key={item.product.id}
                  product={item.product}
                  quantity={item.quantity}
                  totalPrice={itemTotalPrice}
                  onDecrease={() => handleDecrease(item.product.id)}
                  onIncrease={() => handleIncrease(item.product.id)}
                  onRemove={() => handleRemove(item.product.id)}
                />
              );
            })}
            {deliveryMethod === 'delivery' && (
              <div className="flex justify-between items-center mb-2">
                <span className="text-base font-semibold text-black">Стоимость доставки</span>
                <span className="text-base font-semibold text-black">{deliveryAmount} руб.</span>
              </div>
            )}
            {/* Total Price */}
            <div className="flex justify-between items-center mb-6">
              <span className="text-base font-bold text-black">Итого:</span>
              <span className="text-base font-bold text-black">{totalPriceWithDelivery} руб.</span>
            </div>
          </>
        )}

        {/* Delivery Method */}
        <div className="mb-6">
          <h3 className="text-base font-bold leading-[1.174] text-black mb-4">
            Способ получение
          </h3>
          <div className="relative h-10 bg-[#D9D9D9] rounded-[10px] overflow-hidden">
            <div
              className={`absolute top-0 h-full w-1/2 bg-[#80D1C1] rounded-[10px] transition-transform duration-300 ${
                deliveryMethod === 'delivery' ? 'translate-x-full' : 'translate-x-0'
              }`}
            />
            <div className="relative h-full flex">
              <button
                onClick={() => {
                  setDeliveryMethod('pickup');
                  webApp?.HapticFeedback.selectionChanged();
                }}
                className="flex-1 text-base font-medium leading-[1.174] text-black"
              >
                Самовывоз
              </button>
              <button
                onClick={() => {
                  setDeliveryMethod('delivery');
                  webApp?.HapticFeedback.selectionChanged();
                }}
                className="flex-1 text-base font-medium leading-[1.174] text-black"
              >
                Курьером
              </button>
            </div>
          </div>
        </div>

        {/* Address */}
        {deliveryMethod === 'pickup' ? (
          <div className="flex items-center gap-3 mb-8">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
              <g clipPath="url(#clip0_location)">
                <path d="M20 20C20.55 20 21.0208 19.8042 21.4125 19.4125C21.8042 19.0208 22 18.55 22 18C22 17.45 21.8042 16.9792 21.4125 16.5875C21.0208 16.1958 20.55 16 20 16C19.45 16 18.9792 16.1958 18.5875 16.5875C18.1958 16.9792 18 17.45 18 18C18 18.55 18.1958 19.0208 18.5875 19.4125C18.9792 19.8042 19.45 20 20 20ZM20 27.35C22.0333 25.4833 23.5417 23.7875 24.525 22.2625C25.5083 20.7375 26 19.3833 26 18.2C26 16.3833 25.4208 14.8958 24.2625 13.7375C23.1042 12.5792 21.6833 12 20 12C18.3167 12 16.8958 12.5792 15.7375 13.7375C14.5792 14.8958 14 16.3833 14 18.2C14 19.3833 14.4917 20.7375 15.475 22.2625C16.4583 23.7875 17.9667 25.4833 20 27.35ZM20 30C17.3167 27.7167 15.3125 25.5958 13.9875 23.6375C12.6625 21.6792 12 19.8667 12 18.2C12 15.7 12.8042 13.7083 14.4125 12.225C16.0208 10.7417 17.8833 10 20 10C22.1167 10 23.9792 10.7417 25.5875 12.225C27.1958 13.7083 28 15.7 28 18.2C28 19.8667 27.3375 21.6792 26.0125 23.6375C24.6875 25.5958 22.6833 27.7167 20 30Z" fill="#49454F"/>
              </g>
              <defs>
                <clipPath id="clip0_location">
                  <rect width="40" height="40" rx="20" fill="white"/>
                </clipPath>
              </defs>
            </svg>
            <p className="text-base font-semibold leading-[1.174] text-black flex-1">
              {selectedAddress}
            </p>
            <button
              onClick={onOpenStoreAddresses}
              className="text-base font-semibold leading-[1.174] text-black hover:opacity-70 transition-opacity"
            >
              Выбрать
            </button>
          </div>
        ) : (
          <div className="mb-8">
            <div className="relative">
              <input
                type="text"
                value={customAddress}
                onChange={(e) => setCustomAddress(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {
                  // Delay to allow click on suggestion
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                placeholder="Введите адрес доставки"
                className="w-full h-[53px] px-4 rounded-[15px] shadow-[0px_2px_4px_0px_rgba(0,0,0,0.25)] text-base font-semibold leading-[1.174] text-black bg-white"
              />
              {/* Address suggestions dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-[15px] shadow-[0px_2px_8px_0px_rgba(0,0,0,0.15)] z-10 max-h-[200px] overflow-y-auto">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        setCustomAddress(suggestion.value);
                        setSuggestions([]);
                        setShowSuggestions(false);
                        webApp?.HapticFeedback.selectionChanged();
                      }}
                      className="w-full px-4 py-3 text-left text-sm text-black hover:bg-gray-100 first:rounded-t-[15px] last:rounded-b-[15px] border-b border-gray-100 last:border-b-0"
                    >
                      {suggestion.value}
                    </button>
                  ))}
                </div>
              )}
              {/* Loading indicator */}
              {showSuggestions && isLoadingSuggestions && customAddress.length >= 3 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-[15px] shadow-[0px_2px_8px_0px_rgba(0,0,0,0.15)] z-10 px-4 py-3 text-sm text-gray-500">
                  Загрузка...
                </div>
              )}
            </div>

            {/* Delivery date/time (courier only) */}
            <div className="mt-4">
              <button
                type="button"
                onPointerDown={openDeliveryDateTimeModal}
                onClick={openDeliveryDateTimeModal}
                className="w-full px-4 py-4 rounded-[15px] shadow-[0px_2px_4px_0px_rgba(0,0,0,0.25)] bg-white flex items-center justify-between"
              >
                <div className="text-left">
                  <div className="text-xs text-gray-500">Дата и время доставки</div>
                  <div className="text-base font-semibold text-black mt-1">
                    {deliveryDate && deliveryTime
                      ? `${formatDeliveryDate(deliveryDate)} ${deliveryTime}`
                      : 'Выбрать'}
                  </div>
                </div>
                <div className="text-black opacity-60 text-xl leading-none">›</div>
              </button>
            </div>
          </div>
        )}

        <DeliveryDateTimeModal
          isOpen={isDeliveryDateTimeOpen}
          onClose={() => setIsDeliveryDateTimeOpen(false)}
          initialDate={deliveryDate}
          initialTime={deliveryTime}
          workTimeFrom={workTimeFrom}
          workTimeTo={workTimeTo}
          onApply={(date, time) => {
            setDeliveryDate(date);
            setDeliveryTime(time);
          }}
        />

        {/* Buy Button */}
        <button
          onClick={handleBuy}
          disabled={cartItems.length === 0 || isSubmitting}
          className={`w-full h-[66px] rounded-[30px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] flex items-center justify-center ${
            cartItems.length > 0 && !isSubmitting ? 'bg-[#80D1C1]' : 'bg-gray-300'
          }`}
        >
          <span className="text-xl font-medium leading-[1.174] text-black">
            {isSubmitting ? 'Оформление...' : 'Заказать'}
          </span>
        </button>
        </div>
      </div>
    </div>
  );
};

export default Cart;
