import React, { useState, useEffect } from 'react';
import AppHeader from './AppHeader';
import { fetchShopAddresses, ShopAddress, createShopAddress, updateShopAddress, deleteShopAddress } from '../api/client';

interface StoreAddressesProps {
  onSelectAddress: (address: string) => void;
  onMenuClick: () => void;
  userMode?: string;
  initData?: string;
}

const StoreAddresses: React.FC<StoreAddressesProps> = ({
  onSelectAddress,
  onMenuClick,
  userMode,
  initData,
}) => {
  const [addresses, setAddresses] = useState<ShopAddress[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = userMode === 'ADMIN';

  const loadAddresses = () => {
    setIsLoading(true);
    setError(null);

    fetchShopAddresses()
      .then((data) => {
        setAddresses(data);
      })
      .catch((err) => {
        console.error('Failed to fetch shop addresses:', err);
        setError('Не удалось загрузить адреса магазинов');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  const handleAddressClick = (address: string) => {
    if (isEditing) return;
    onSelectAddress(address);
  };

  const handleAddNew = () => {
    setIsEditing(true);
    setEditingId(null);
    setEditValue('');
  };

  const handleEdit = (address: ShopAddress) => {
    setIsEditing(true);
    setEditingId(address.id);
    setEditValue(address.address);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingId(null);
    setEditValue('');
  };

  const handleSave = async () => {
    if (!editValue.trim() || !initData) return;

    setIsSubmitting(true);
    setError(null);

    try {
      if (editingId === null) {
        // Create new address
        await createShopAddress(editValue.trim(), initData);
      } else {
        // Update existing address
        await updateShopAddress(editingId, editValue.trim(), initData);
      }

      // Reload addresses
      await loadAddresses();

      // Clear form
      setIsEditing(false);
      setEditingId(null);
      setEditValue('');
    } catch (err) {
      console.error('Failed to save address:', err);
      setError('Не удалось сохранить адрес');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (addressId: number) => {
    if (!initData) return;
    if (!confirm('Вы уверены, что хотите удалить этот адрес?')) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await deleteShopAddress(addressId, initData);
      await loadAddresses();
    } catch (err) {
      console.error('Failed to delete address:', err);
      setError('Не удалось удалить адрес');
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="fixed inset-0 bg-white z-50 max-w-[402px] mx-auto">
      <div className="flex flex-col h-full">
        {/* Header */}
        <AppHeader
          title="FanFanTulpan"
          actionType="menu-text"
          onAction={onMenuClick}
        />

        {/* Page Title */}
        <div className="px-6 mt-[30px]">
          <h1 className="text-2xl font-normal text-black">Адреса магазинов</h1>
        </div>

        {/* Add New Button (ADMIN only) */}
        {isAdmin && !isEditing && (
          <div className="px-6 mt-4">
            <button
              onClick={handleAddNew}
              disabled={isSubmitting}
              className="w-full bg-teal text-white py-3 rounded-[30px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Добавить адрес
            </button>
          </div>
        )}

        {/* Edit Form (ADMIN only) */}
        {isAdmin && isEditing && (
          <div className="px-6 mt-4">
            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder="Введите адрес магазина"
                disabled={isSubmitting}
                className="w-full px-4 py-3 border border-gray-300 rounded-[20px] focus:outline-none focus:border-teal disabled:opacity-50"
              />
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={isSubmitting || !editValue.trim()}
                  className="flex-1 bg-teal text-white py-3 rounded-[30px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isSubmitting ? 'Сохранение...' : 'Сохранить'}
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={isSubmitting}
                  className="flex-1 bg-gray-300 text-black py-3 rounded-[30px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center mt-[50px]">
            <p className="text-gray-medium">Загрузка адресов...</p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="flex justify-center items-center mt-[50px]">
            <p className="text-red-500">{error}</p>
          </div>
        )}

        {/* Address List */}
        {!isLoading && !error && (
          <div className="flex flex-col gap-[30px] px-[30px] mt-[25px]">
            {addresses.map((address) => (
              <div key={address.id} className="flex items-center justify-between gap-3">
                <button
                  onClick={() => handleAddressClick(address.address)}
                  disabled={isEditing || isSubmitting}
                  className={`flex-1 text-base font-semibold leading-[1.174] text-black text-left transition-opacity ${
                    !isEditing && !isSubmitting
                      ? 'hover:opacity-70 cursor-pointer'
                      : 'cursor-default'
                  }`}
                >
                  {address.address}
                </button>

                {/* Edit and Delete buttons (ADMIN only) */}
                {isAdmin && !isEditing && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(address)}
                      disabled={isSubmitting}
                      className="px-3 py-1 bg-gray-200 text-black text-sm rounded-[15px] hover:opacity-70 transition-opacity disabled:opacity-50"
                    >
                      Изменить
                    </button>
                    <button
                      onClick={() => handleDelete(address.id)}
                      disabled={isSubmitting}
                      className="px-3 py-1 bg-red-500 text-white text-sm rounded-[15px] hover:opacity-70 transition-opacity disabled:opacity-50"
                    >
                      Удалить
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StoreAddresses;
