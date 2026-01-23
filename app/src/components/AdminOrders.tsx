import React, { useState, useEffect, useCallback } from 'react';
import AppHeader from './AppHeader';
import { fetchAllOrders, OrderDTO, fetchAllGoods, GoodDTO, updateOrderStatus, OrdersFilterParams, fetchDeliveryAmount, fetchPostcardAmount } from '../api/client';

type DatePeriod = 'all' | 'today' | '3days' | 'week' | 'month' | 'custom';
const ORDERS_PER_PAGE = 20;
const ALL_STATUSES = ['NEW', 'PROCESSING', 'SENT', 'COMPLETED', 'CANCELLED'] as const;

interface AdminOrdersProps {
  isOpen: boolean;
  onMenuClick: () => void;
  initData?: string;
}

const AdminOrders: React.FC<AdminOrdersProps> = ({
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
  const [statusPopupOrderId, setStatusPopupOrderId] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // Filter states
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [datePeriod, setDatePeriod] = useState<DatePeriod>('all');
  const [customDateFrom, setCustomDateFrom] = useState<string>('');
  const [customDateTo, setCustomDateTo] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

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

  // Calculate date range based on period
  const getDateRange = useCallback((): { dateFrom?: string; dateTo?: string } => {
    const now = new Date();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    switch (datePeriod) {
      case 'today': {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        return { dateFrom: startOfDay.toISOString(), dateTo: endOfDay.toISOString() };
      }
      case '3days': {
        const start = new Date(now);
        start.setDate(start.getDate() - 2);
        start.setHours(0, 0, 0, 0);
        return { dateFrom: start.toISOString(), dateTo: endOfDay.toISOString() };
      }
      case 'week': {
        const start = new Date(now);
        start.setDate(start.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        return { dateFrom: start.toISOString(), dateTo: endOfDay.toISOString() };
      }
      case 'month': {
        const start = new Date(now);
        start.setDate(start.getDate() - 29);
        start.setHours(0, 0, 0, 0);
        return { dateFrom: start.toISOString(), dateTo: endOfDay.toISOString() };
      }
      case 'custom': {
        const result: { dateFrom?: string; dateTo?: string } = {};
        if (customDateFrom) {
          result.dateFrom = new Date(customDateFrom).toISOString();
        }
        if (customDateTo) {
          const to = new Date(customDateTo);
          to.setHours(23, 59, 59, 999);
          result.dateTo = to.toISOString();
        }
        return result;
      }
      default:
        return {};
    }
  }, [datePeriod, customDateFrom, customDateTo]);

  // Load orders with current filters
  const loadOrders = useCallback(async () => {
    if (!initData) return;

    setIsLoading(true);
    setError(null);

    try {
      const dateRange = getDateRange();
      const filters: OrdersFilterParams = {
        statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
        dateFrom: dateRange.dateFrom,
        dateTo: dateRange.dateTo,
        limit: ORDERS_PER_PAGE,
        offset: (currentPage - 1) * ORDERS_PER_PAGE,
      };

      const result = await fetchAllOrders(initData, filters);
      setOrders(result.items);
      setTotalOrders(result.total);
    } catch (err) {
      console.error('Failed to load orders:', err);
      setError('Не удалось загрузить заказы');
    } finally {
      setIsLoading(false);
    }
  }, [initData, selectedStatuses, getDateRange, currentPage]);

  // Load goods once on mount
  useEffect(() => {
    if (!isOpen || !initData) return;

    const loadGoods = async () => {
      try {
        const goodsData = await fetchAllGoods(initData);
        setGoods(goodsData);
      } catch (err) {
        console.error('Failed to load goods:', err);
      }
    };

    loadGoods();
  }, [isOpen, initData]);

  // Load service amounts once when screen opens
  useEffect(() => {
    if (!isOpen || !initData) return;

    Promise.all([fetchDeliveryAmount(initData), fetchPostcardAmount(initData)])
      .then(([deliveryAmountValue, postcardAmountValue]) => {
        const parsedDelivery = parseFloat(String(deliveryAmountValue).replace(/[^\d]/g, '')) || 0;
        const parsedPostcard = parseFloat(String(postcardAmountValue).replace(/[^\d]/g, '')) || 0;
        setDeliveryAmount(parsedDelivery);
        setPostcardAmount(parsedPostcard);
      })
      .catch((err) => {
        console.error('Failed to fetch service amounts:', err);
        setDeliveryAmount(0);
        setPostcardAmount(0);
      });
  }, [isOpen, initData]);

  // Load orders when filters or page changes
  useEffect(() => {
    if (!isOpen) return;

    if (!initData) {
      console.error('AdminOrders: initData is not available');
      setError('Ошибка авторизации. Перезапустите приложение.');
      return;
    }

    loadOrders();
  }, [isOpen, initData, loadOrders]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStatuses, datePeriod, customDateFrom, customDateTo]);

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

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'NEW':
        return 'text-gray-600';
      case 'PROCESSING':
        return 'text-blue-600';
      case 'SENT':
        return 'text-purple-600';
      case 'COMPLETED':
        return 'text-emerald-600';
      case 'CANCELLED':
        return 'text-red-600';
      default:
        return 'text-gray-600';
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

  const toggleStatus = (status: string) => {
    setSelectedStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const getDatePeriodLabel = (period: DatePeriod): string => {
    switch (period) {
      case 'all': return 'Все';
      case 'today': return 'Сегодня';
      case '3days': return '3 дня';
      case 'week': return 'Неделя';
      case 'month': return 'Месяц';
      case 'custom': return 'Свой';
      default: return '';
    }
  };

  const totalPages = Math.ceil(totalOrders / ORDERS_PER_PAGE);

  const handleChangeStatus = (orderId: number, currentStatus: string) => {
    setStatusPopupOrderId(orderId);
    setSelectedStatus(currentStatus);
  };

  const handleCancelOrder = async (orderId: number, currentStatus: string) => {
    if (!initData) {
      alert('Ошибка: нет данных авторизации');
      return;
    }

    if (currentStatus === 'CANCELLED') {
      alert('Заказ уже отменён');
      return;
    }

    try {
      await updateOrderStatus(orderId, 'CANCELLED', initData);
      await loadOrders();
      alert('Заказ отменён');
    } catch (err) {
      console.error('Failed to cancel order:', err);
      alert('Не удалось отменить заказ');
    }
  };

  const handleSaveStatus = async () => {
    if (!statusPopupOrderId || !initData) return;

    const order = orders.find(o => o.id === statusPopupOrderId);
    if (!order) return;

    // Check if status changed
    if (selectedStatus === order.status) {
      setStatusPopupOrderId(null);
      return;
    }

    try {
      await updateOrderStatus(statusPopupOrderId, selectedStatus, initData);
      await loadOrders();
      setStatusPopupOrderId(null);
      alert('Статус заказа изменён');
    } catch (err) {
      console.error('Failed to update order status:', err);
      alert('Не удалось изменить статус');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white z-50 max-w-[402px] mx-auto">
      <div className="h-full overflow-y-auto">
        <AppHeader
          title="Управление заказами"
          actionType="menu-text"
          onAction={onMenuClick}
        />

        {/* Filter Toggle Button */}
        <div className="px-6 pt-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-sm text-teal font-medium"
          >
            <svg className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            Фильтры
            {(selectedStatuses.length > 0 || datePeriod !== 'all') && (
              <span className="bg-teal text-white text-xs px-2 py-0.5 rounded-full">
                {selectedStatuses.length + (datePeriod !== 'all' ? 1 : 0)}
              </span>
            )}
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="px-6 py-4 border-b border-gray-200 space-y-4">
            {/* Status Filters */}
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">Статус заказа:</div>
              <div className="flex flex-wrap gap-2">
                {ALL_STATUSES.map(status => (
                  <button
                    key={status}
                    onClick={() => toggleStatus(status)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                      selectedStatuses.includes(status)
                        ? 'bg-teal text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {getStatusLabel(status)}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Period Filters */}
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">Период:</div>
              <div className="flex flex-wrap gap-2">
                {(['all', 'today', '3days', 'week', 'month', 'custom'] as DatePeriod[]).map(period => (
                  <button
                    key={period}
                    onClick={() => setDatePeriod(period)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                      datePeriod === period
                        ? 'bg-teal text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {getDatePeriodLabel(period)}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Date Range */}
            {datePeriod === 'custom' && (
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 block mb-1">От:</label>
                  <input
                    type="date"
                    value={customDateFrom}
                    onChange={(e) => setCustomDateFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 block mb-1">До:</label>
                  <input
                    type="date"
                    value={customDateTo}
                    onChange={(e) => setCustomDateTo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            )}

            {/* Clear Filters */}
            {(selectedStatuses.length > 0 || datePeriod !== 'all') && (
              <button
                onClick={() => {
                  setSelectedStatuses([]);
                  setDatePeriod('all');
                  setCustomDateFrom('');
                  setCustomDateTo('');
                }}
                className="text-sm text-red-500 hover:text-red-600"
              >
                Сбросить фильтры
              </button>
            )}
          </div>
        )}

        {/* Results count and pagination */}
        <div className="px-6 py-2 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Найдено: {totalOrders} {totalOrders === 1 ? 'заказ' : totalOrders < 5 ? 'заказа' : 'заказов'}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`p-1 ${currentPage === 1 ? 'text-gray-300' : 'text-gray-600 hover:text-teal'}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <span className="text-sm text-gray-600 min-w-[40px] text-center">
                {currentPage}/{totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={`p-1 ${currentPage === totalPages ? 'text-gray-300' : 'text-gray-600 hover:text-teal'}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          )}
        </div>

        <div className="px-6 py-4">
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

          {!isLoading && !error && orders.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Нет заказов
            </div>
          )}

          {!isLoading && !error && orders.length > 0 && (
            <div className="space-y-4">
              {orders.map((order) => (
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
                      <div className="text-sm text-black mt-1">
                        Телефон: {order.user_phone || 'не указан'}
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

                    {/* Action Buttons */}
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => handleChangeStatus(order.id, order.status)}
                        disabled={order.status === 'CANCELLED' || order.status === 'COMPLETED'}
                        className={`flex-1 py-2 px-4 rounded-[20px] font-medium transition-opacity ${
                          order.status === 'CANCELLED' || order.status === 'COMPLETED'
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-teal text-white hover:opacity-90'
                        }`}
                      >
                        Изменить статус
                      </button>
                      <button
                        onClick={() => handleCancelOrder(order.id, order.status)}
                        disabled={order.status === 'CANCELLED' || order.status === 'COMPLETED'}
                        className={`flex-1 py-2 px-4 rounded-[20px] font-medium transition-opacity ${
                          order.status === 'CANCELLED' || order.status === 'COMPLETED'
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-red-500 text-white hover:opacity-90'
                        }`}
                      >
                        Отменить
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-6 pb-4">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className={`px-4 py-2 rounded-[20px] font-medium transition-opacity ${
                      currentPage === 1
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-teal text-white hover:opacity-90'
                    }`}
                  >
                    Назад
                  </button>
                  <span className="text-sm text-gray-600">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className={`px-4 py-2 rounded-[20px] font-medium transition-opacity ${
                      currentPage === totalPages
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-teal text-white hover:opacity-90'
                    }`}
                  >
                    Вперёд
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Status Change Popup */}
      {statusPopupOrderId !== null && (() => {
        const currentOrder = orders.find(o => o.id === statusPopupOrderId);
        const isFinalized = currentOrder && (currentOrder.status === 'CANCELLED' || currentOrder.status === 'COMPLETED');
        const availableStatuses = isFinalized
          ? ['NEW', 'PROCESSING', 'SENT', 'COMPLETED']
          : ['NEW', 'PROCESSING', 'SENT', 'COMPLETED', 'CANCELLED'];
        
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] max-w-[402px] mx-auto">
            <div className="bg-white rounded-[20px] p-6 m-4 max-w-[340px] w-full">
              <h3 className="text-lg font-semibold mb-4">Изменить статус заказа</h3>
              
              <div className="space-y-2 mb-6">
                {availableStatuses.map((status) => (
                  <label
                    key={status}
                    className="flex items-center gap-3 p-3 border border-gray-200 rounded-[12px] cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="radio"
                      name="status"
                      value={status}
                      checked={selectedStatus === status}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="w-4 h-4 text-teal"
                    />
                    <span className={`text-sm font-medium ${getStatusTextColor(status)}`}>
                      {getStatusLabel(status)}
                    </span>
                  </label>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStatusPopupOrderId(null)}
                  className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-[20px] font-medium hover:opacity-90 transition-opacity"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSaveStatus}
                  className="flex-1 py-2 px-4 bg-teal text-white rounded-[20px] font-medium hover:opacity-90 transition-opacity"
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default AdminOrders;

