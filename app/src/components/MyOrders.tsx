import React, { useState, useEffect } from 'react';
import AppHeader from './AppHeader';
import { fetchMyOrders, OrderDTO, fetchAllGoods, GoodDTO, fetchDeliveryAmount, fetchPostcardAmount } from '../api/client';

interface MyOrdersProps {
  isOpen: boolean;
  onMenuClick: () => void;
  initData?: string;
}

const MyOrders: React.FC<MyOrdersProps> = ({
  isOpen,
  onMenuClick,
  initData
}) => {
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [goods, setGoods] = useState<GoodDTO[]>([]);
  const [deliveryAmount, setDeliveryAmount] = useState<number>(0);
  const [postcardAmount, setPostcardAmount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      // Restore body scroll when modal closes
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (!initData) {
      console.error('MyOrders: initData is not available');
      setError('Ошибка авторизации. Перезапустите приложение.');
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      console.log('MyOrders: Loading orders with initData length:', initData.length);

      try {
        // Load orders and goods in parallel
        const [ordersData, goodsData, deliveryAmountValue, postcardAmountValue] = await Promise.all([
          fetchMyOrders(initData),
          fetchAllGoods(initData),
          fetchDeliveryAmount(initData),
          fetchPostcardAmount(initData)
        ]);

        setOrders(ordersData);
        setGoods(goodsData);

        const parsedDelivery = parseFloat(String(deliveryAmountValue).replace(/[^\d]/g, '')) || 0;
        const parsedPostcard = parseFloat(String(postcardAmountValue).replace(/[^\d]/g, '')) || 0;
        setDeliveryAmount(parsedDelivery);
        setPostcardAmount(parsedPostcard);
      } catch (err) {
        console.error('Failed to load orders:', err);
        setError('Не удалось загрузить заказы');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isOpen, initData]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW':
        return 'text-gray-600 bg-gray-100 px-2 py-1 rounded-full whitespace-nowrap';
      case 'PROCESSING':
        return 'text-blue-600 bg-blue-50 px-2 py-1 rounded-full whitespace-nowrap';
      case 'SENT':
        return 'text-purple-600 bg-purple-50 px-2 py-1 rounded-full whitespace-nowrap';
      case 'COMPLETED':
        return 'text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full whitespace-nowrap';
      case 'CANCELLED':
        return 'text-red-600 bg-red-50 px-2 py-1 rounded-full whitespace-nowrap';
      default:
        return 'text-gray-600 bg-gray-100 px-2 py-1 rounded-full whitespace-nowrap';
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      'NEW': 'Создан',
      'PROCESSING': 'Собирается',
      'SENT': 'Отправлен',
      'COMPLETED': 'Завершён',
      'CANCELLED': 'Отменён'
    };
    return statusMap[status] || status;
  };

  const getGoodImage = (goodId: number): string => {
    const good = goods.find(g => g.id === goodId);
    if (good && good.images && good.images.length > 0) {
      return good.images[0].image_url;
    }
    return '/images/placeholder.png';
  };

  const filteredOrders = orders.filter(order => {
    if (activeTab === 'active') {
      return ['NEW', 'PROCESSING', 'SENT'].includes(order.status);
    } else {
      return ['COMPLETED', 'CANCELLED'].includes(order.status);
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white z-50 max-w-[402px] mx-auto">
      <div className="h-full overflow-y-auto">
        <AppHeader
          title="Мои заказы"
          actionType="menu-text"
          onAction={onMenuClick}
        />

        {/* Order Filter Toggle */}
        <div className="px-6 pt-4">
          <div className="relative h-10 bg-[#D9D9D9] rounded-[10px] overflow-hidden">
            <div
              className={`absolute top-0 h-full w-1/2 bg-[#80D1C1] rounded-[10px] transition-transform duration-300 ${
                activeTab === 'completed' ? 'translate-x-full' : 'translate-x-0'
              }`}
            />
            <div className="relative h-full flex">
              <button
                onClick={() => setActiveTab('active')}
                className="flex-1 text-base font-medium leading-[1.174] text-black"
              >
                Активные
              </button>
              <button
                onClick={() => setActiveTab('completed')}
                className="flex-1 text-base font-medium leading-[1.174] text-black"
              >
                Завершенные
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 py-6">
          {isLoading && (
            <div className="text-center py-8 text-gray-500">
              Загрузка заказов...
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-red-500">
              {error}
            </div>
          )}

          {!isLoading && !error && filteredOrders.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {activeTab === 'active' ? 'Нет активных заказов' : 'Нет завершенных заказов'}
            </div>
          )}

          {!isLoading && !error && filteredOrders.length > 0 && (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-[20px] shadow-custom p-4"
                >
                  {/* Order Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="text-lg font-semibold">
                        Заказ #{order.id}
                      </div>
                      <div className="text-sm text-black mt-1">
                        {formatDate(order.createstamp)}
                      </div>
                    </div>
                    <div className={`text-sm font-bold ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </div>
                  </div>

                  {/* Delivery Info */}
                  <div className="text-sm text-black mb-3">
                    <div>
                      {order.delivery_type === 'PICK_UP' ? 'Самовывоз' : 'Доставка'}
                    </div>
                    <div className="text-black">
                      {order.delivery_address}
                    </div>
                    {order.delivery_type === 'COURIER' && order.delivery_date_time ? (
                      <div className="text-black">
                        Доставка к: {formatDate(order.delivery_date_time)}
                      </div>
                    ) : null}
                  </div>

                  {/* Order Items */}
                  <div className="border-t border-gray-200 pt-3">
                    <div className="text-sm font-medium mb-2">Товары:</div>
                    <div className="space-y-2">
                      {order.cart_items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3"
                        >
                          {/* Product Image */}
                          <img
                            src={getGoodImage(item.good_id)}
                            alt={item.good_name}
                            className="w-[60px] h-[60px] rounded-lg object-cover"
                          />

                          {/* Product Info */}
                          <div className="flex-1">
                            <div className="text-sm font-medium">
                              {item.good_name}
                            </div>
                            <div className="text-sm text-black">
                              {item.count} шт. × {item.price} руб.
                            </div>
                          </div>

                          {/* Total Price */}
                          <div className="text-sm font-semibold">
                            {item.count * item.price} руб.
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Services */}
                    {(() => {
                      const hasDeliveryService = order.delivery_type === 'COURIER';
                      const hasPostcardService = Boolean(order.postcard_text && order.postcard_text.trim());
                      const services: Array<{ label: string; amount: number }> = [];
                      if (hasDeliveryService) services.push({ label: 'Доставка', amount: deliveryAmount });
                      if (hasPostcardService) services.push({ label: 'Открытка', amount: postcardAmount });

                      if (services.length === 0) return null;
                      return (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="text-sm font-medium mb-2">Услуги:</div>
                          <div className="space-y-1">
                            {services.map((service) => (
                              <div
                                key={service.label}
                                className="flex justify-between items-center text-sm text-black"
                              >
                                <span>{service.label}</span>
                                <span className="font-semibold">{service.amount} руб.</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Order Total */}
                    <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center">
                      <div className="font-semibold">Итого:</div>
                      <div className="text-lg font-bold text-teal">
                        {(() => {
                          const goodsTotal = order.cart_items.reduce((sum, item) => sum + (item.count * item.price), 0);
                          const deliveryCost = order.delivery_type === 'COURIER' ? deliveryAmount : 0;
                          const postcardCost = order.postcard_text && order.postcard_text.trim() ? postcardAmount : 0;
                          return goodsTotal + deliveryCost + postcardCost;
                        })()} руб.
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyOrders;
