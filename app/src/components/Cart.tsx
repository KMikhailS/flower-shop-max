import React from 'react';
import AppHeader from './AppHeader';
import CartItem from './CartItem';
import { useMaxWebApp } from '../hooks/useMaxWebApp';
import { CartItemData } from '../App';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { useDebounce } from '../hooks/useDebounce';
import { createOrder, OrderRequest, fetchUserInfo, updateUserPhone, suggestAddress, AddressSuggestion, fetchDeliveryAmount, fetchPostcardAmount, fetchWorkTime } from '../api/client';
import DeliveryDateTimeModal from './DeliveryDateTimeModal';

interface CartProps {
  cartItems: CartItemData[];
  onOpenMenu: () => void;
  onGoToCatalog: () => void;
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
  onGoToCatalog,
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
  const { webApp, user } = useMaxWebApp();
  const [customAddress, setCustomAddress] = React.useState('г Тюмень, ');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = React.useState(false);
  const [deliveryAmount, setDeliveryAmount] = React.useState<number>(0);
  const [postcardAmount, setPostcardAmount] = React.useState<number>(0);
  const [deliveryDate, setDeliveryDate] = React.useState<string>('');
  const [deliveryTime, setDeliveryTime] = React.useState<string>('');
  const [isDeliveryDateTimeOpen, setIsDeliveryDateTimeOpen] = React.useState(false);
  const [workTimeFrom, setWorkTimeFrom] = React.useState<string>('');
  const [workTimeTo, setWorkTimeTo] = React.useState<string>('');
  const [addPostcard, setAddPostcard] = React.useState(false);
  const [postcardText, setPostcardText] = React.useState('');

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

  // Fetch postcard amount for cart calculations
  React.useEffect(() => {
    const initData = webApp?.initData || '';
    if (!initData) return;

    fetchPostcardAmount(initData)
      .then((value) => {
        const parsed = parseFloat(String(value).replace(/[^\d]/g, '')) || 0;
        setPostcardAmount(parsed);
      })
      .catch((error) => {
        console.error('Failed to fetch postcard amount:', error);
        setPostcardAmount(0);
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
  const postcardCost = addPostcard && cartItems.length > 0 ? postcardAmount : 0;
  const totalPriceWithDelivery = totalPrice + deliveryCost + postcardCost;

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
      window.alert('Пожалуйста, введите адрес доставки');
      return;
    }

    // Валидация даты/времени доставки для курьера
    if (deliveryMethod === 'delivery' && (!deliveryDate || !deliveryTime)) {
      webApp?.HapticFeedback.notificationOccurred('error');
      window.alert('Пожалуйста, выберите дату и время доставки');
      return;
    }

    // Валидация текста открытки (если выбрана)
    if (addPostcard && !postcardText.trim()) {
      webApp?.HapticFeedback.notificationOccurred('error');
      window.alert('Пожалуйста, введите текст для открытки');
      return;
    }
    if (addPostcard && postcardText.length > 300) {
      webApp?.HapticFeedback.notificationOccurred('error');
      window.alert('Текст для открытки не должен превышать 300 символов');
      return;
    }

    // Проверяем наличие user
    if (!user) {
      webApp?.HapticFeedback.notificationOccurred('error');
      window.alert('Ошибка: не удалось получить данные пользователя');
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

        const shouldRequest = window.confirm('Для оформления заказа нам нужен ваш номер телефона. Поделиться контактом?');
        if (!shouldRequest) {
          window.alert('Без контактных данных мы не сможем связаться с вами для оформления заказа');
          return;
        }

        if (webApp?.requestContact) {
          webApp.requestContact(async (result) => {
            if (result.status === 'ok' && result.data?.phone_number) {
              try {
                await updateUserPhone(result.data.phone_number, initData);
                webApp?.HapticFeedback.notificationOccurred('success');
                window.alert('Номер телефона получен! Нажмите "Заказать" ещё раз.');
              } catch (e) {
                console.error('Failed to save phone:', e);
                window.alert('Не удалось сохранить номер телефона.');
              }
            } else {
              window.alert('Не удалось получить номер телефона.');
            }
          });
        } else {
          window.alert('Ваше приложение не поддерживает запрос контакта.');
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
        postcard_text: addPostcard ? postcardText : undefined,
        cart_items: cartItems.map(item => ({
          good_id: item.product.id,
          count: item.quantity,
        })),
      };

      // Отправляем заказ на бэкенд
      const createdOrder = await createOrder(orderRequest, initData);

      console.log('Order created successfully:', createdOrder);

      const goToOrders = window.confirm('Заказ успешно оформлен!\n\nИнформация о заказе в разделе Мои заказы. Перейти?');
      if (goToOrders) {
        onOpenMyOrders();
      }

      // Очищаем корзину после успешной покупки
      onClearCart();
    } catch (error) {
      console.error('Failed to create order:', error);
      webApp?.HapticFeedback.notificationOccurred('error');
      window.alert(`Ошибка при создании заказа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
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
          <div className="flex flex-col items-center justify-center py-16">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-6 text-teal">
              <path d="M28 68C30.2091 68 32 66.2091 32 64C32 61.7909 30.2091 60 28 60C25.7909 60 24 61.7909 24 64C24 66.2091 25.7909 68 28 68Z" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M60 68C62.2091 68 64 66.2091 64 64C64 61.7909 62.2091 60 60 60C57.7909 60 56 61.7909 56 64C56 66.2091 57.7909 68 60 68Z" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 12H16L22.4 45.6C22.6 46.8 23.3 47.9 24.3 48.6C25.3 49.3 26.5 49.6 27.7 49.5H58.4C59.6 49.6 60.8 49.3 61.8 48.6C62.8 47.9 63.5 46.8 63.7 45.6L68 24H18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h3 className="text-xl font-semibold text-gray-800 mb-2 font-raleway">Ваша корзина пуста</h3>
            <p className="text-gray-medium text-sm mb-8">Самое время добавить в неё что-нибудь</p>
            <button
              onClick={onGoToCatalog}
              className="bg-teal text-white font-medium py-3 px-10 rounded-full text-base font-raleway hover:opacity-90 transition-opacity"
            >
              Перейти в каталог
            </button>
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
            {addPostcard && (
              <div className="flex justify-between items-center mb-2">
                <span className="text-base font-semibold text-black">Стоимость открытки</span>
                <span className="text-base font-semibold text-black">{postcardAmount} руб.</span>
              </div>
            )}
            {/* Total Price */}
            <div className="flex justify-between items-center mb-6">
              <span className="text-base font-bold text-black">Итого:</span>
              <span className="text-base font-bold text-black">{totalPriceWithDelivery} руб.</span>
            </div>
          </>
        )}

        {/* Postcard option (before delivery method) */}
        {cartItems.length > 0 && (
          <div className="mb-6">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={addPostcard}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setAddPostcard(checked);
                  if (!checked) {
                    setPostcardText('');
                  }
                  webApp?.HapticFeedback.selectionChanged();
                }}
                className="w-5 h-5 accent-[#80D1C1]"
              />
              <span className="text-base font-bold leading-[1.174] text-black">
                Добавить открытку
              </span>
            </label>

            {addPostcard && (
              <div className="mt-3">
                <div className="w-full px-4 py-4 rounded-[15px] shadow-[0px_2px_4px_0px_rgba(0,0,0,0.25)] bg-white">
                  <label className="block">
                    <textarea
                      value={postcardText}
                      onChange={(e) => {
                        const next = e.target.value;
                        setPostcardText(next.length <= 300 ? next : next.slice(0, 300));
                      }}
                      placeholder="Текст для открытки (не более 300 символов)"
                      maxLength={300}
                      rows={3}
                      className="w-full mt-2 text-base font-semibold leading-[1.174] text-black bg-transparent outline-none resize-none"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Delivery Method */}
        {cartItems.length > 0 && (<><div className="mb-6">
          <h3 className="text-base font-bold leading-[1.174] text-black mb-4">
            Способ получения
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
              <div className="w-full px-4 py-4 rounded-[15px] shadow-[0px_2px_4px_0px_rgba(0,0,0,0.25)] bg-white">
                <label className="block">
                  <div className="text-xs text-gray-500">Адрес доставки</div>
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
                    className="w-full mt-1 text-base font-semibold leading-[1.174] text-black bg-transparent outline-none"
                  />
                </label>
              </div>
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
        </>)}
        </div>
      </div>
    </div>
  );
};

export default Cart;
