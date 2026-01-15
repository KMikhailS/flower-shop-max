import React from 'react';
import AppHeader from './AppHeader';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenStoreAddresses: () => void;
  onOpenDeliveryInfo: () => void;
  onOpenPaymentInfo: () => void;
  onOpenFeedback: () => void;
  onOpenSettings?: () => void;
  onOpenMyOrders: () => void;
  onOpenAdminOrders?: () => void;
  onNavigateHome: () => void;
  userRole?: string;
}

const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  onClose,
  onOpenStoreAddresses,
  onOpenDeliveryInfo,
  onOpenPaymentInfo,
  onOpenFeedback,
  onOpenSettings,
  onOpenMyOrders,
  onOpenAdminOrders,
  onNavigateHome,
  userRole
}) => {
  if (!isOpen) return null;

  const baseMenuItems = [
    { id: 1, label: 'Главная' },
    { id: 2, label: 'Мои заказы' },
    { id: 3, label: 'Оплата' },
    { id: 4, label: 'Доставка' },
    { id: 5, label: 'Адреса магазинов' },
    { id: 6, label: 'Обратная связь' },
  ];

  // Add admin-specific items for ADMIN users only
  const menuItems = userRole === 'ADMIN'
    ? [
        ...baseMenuItems,
        { id: 7, label: 'separator' }, // Separator after "Обратная связь"
        { id: 8, label: 'Управление заказами' },
        { id: 9, label: 'Настройки' }
      ]
    : baseMenuItems;

  return (
    <div className="fixed inset-0 bg-white z-50 max-w-[402px] mx-auto">
      <div className="flex flex-col h-full">
        {/* Header */}
        <AppHeader
          title="FanFanTulpan"
          actionType="close-text"
          onAction={onClose}
        />

        {/* Menu Items */}
        <nav className="flex flex-col gap-[22px] px-8 mt-10">
          {menuItems.map((item) => {
            // Render separator
            if (item.label === 'separator') {
              return (
                <div
                  key={item.id}
                  className="border-t border-gray-200 -mx-8"
                />
              );
            }

            return (
              <a
                key={item.id}
                href="#"
                className="text-2xl font-normal text-black hover:opacity-70 transition-opacity"
                onClick={(e) => {
                  e.preventDefault();
                  if (item.label === 'Адреса магазинов') {
                    onOpenStoreAddresses();
                  } else if (item.label === 'Доставка') {
                    onOpenDeliveryInfo();
                  } else if (item.label === 'Оплата') {
                    onOpenPaymentInfo();
                  } else if (item.label === 'Мои заказы') {
                    onOpenMyOrders();
                  } else if (item.label === 'Обратная связь') {
                    onOpenFeedback();
                  } else if (item.label === 'Управление заказами') {
                    if (onOpenAdminOrders) {
                      onOpenAdminOrders();
                    }
                  } else if (item.label === 'Настройки') {
                    if (onOpenSettings) {
                      onOpenSettings();
                    }
                  } else if (item.label === 'Главная') {
                    onNavigateHome();
                  } else {
                    console.log(`Navigate to: ${item.label}`);
                  }
                }}
              >
                {item.label}
              </a>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default MobileMenu;
