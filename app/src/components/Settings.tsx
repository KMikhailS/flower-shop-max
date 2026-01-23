import React, { useState, useEffect, useRef } from 'react';
import AppHeader from './AppHeader';
import {
  fetchSettings,
  updateUserMode,
  upsertSetting,
  deleteSetting,
  Setting,
  fetchAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  CategoryDTO,
  fetchUserByUsername,
  updateUser,
  UserInfo
} from '../api/client';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onMenuClick: () => void;
  userMode?: string;
  initData?: string;
  onModeChange?: () => void;
}

const Settings: React.FC<SettingsProps> = ({
  isOpen,
  onMenuClick,
  userMode,
  initData,
  onModeChange
}) => {
  const [currentMode, setCurrentMode] = useState<string>(userMode || 'USER');
  const [activeTab, setActiveTab] = useState<'notifications' | 'delivery' | 'categories' | 'users'>('notifications');

  // Notification settings state
  const [supportChatId, setSupportChatId] = useState<string>('');
  const [managerChatId, setManagerChatId] = useState<string>('');
  const [orderEmail, setOrderEmail] = useState<string>('');
  const [orderEmailTo, setOrderEmailTo] = useState<string>('');
  const [orderEmailPassword, setOrderEmailPassword] = useState<string>('');
  const [smtpHost, setSmtpHost] = useState<string>('');
  const [smtpPort, setSmtpPort] = useState<string>('');

  // Delivery settings state
  const [deliveryAmount, setDeliveryAmount] = useState<string>('');
  const [postcardAmount, setPostcardAmount] = useState<string>('');
  const [workTimeFrom, setWorkTimeFrom] = useState<string>('');
  const [workTimeTo, setWorkTimeTo] = useState<string>('');

  // Categories state
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingCategoryTitle, setEditingCategoryTitle] = useState<string>('');
  const [newCategoryTitle, setNewCategoryTitle] = useState<string>('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  // Users tab state
  const [searchUsername, setSearchUsername] = useState<string>('');
  const [foundUser, setFoundUser] = useState<UserInfo | null>(null);
  const [editUserRole, setEditUserRole] = useState<string>('');
  const [editUserMode, setEditUserMode] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false);

  // Common state
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tracks which setting types existed when we loaded settings (so we can delete them when user clears input)
  const existingSettingTypesRef = useRef<Set<string>>(new Set());

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

  // Load settings when component opens
  useEffect(() => {
    if (isOpen && initData) {
      loadSettings();
      loadCategories();
    }
  }, [isOpen, initData]);

  // Update local mode when prop changes
  useEffect(() => {
    if (userMode) {
      setCurrentMode(userMode);
    }
  }, [userMode]);

  const loadSettings = async () => {
    if (!initData) return;

    setIsLoading(true);
    setError(null);

    try {
      const settings = await fetchSettings(initData);
      existingSettingTypesRef.current = new Set(settings.map((s: Setting) => s.type));

      // Find specific settings by type
      const supportSetting = settings.find((s: Setting) => s.type === 'SUPPORT_CHAT_ID');
      const managerSetting = settings.find((s: Setting) => s.type === 'MANAGER_CHAT_ID');
      const orderEmailSetting = settings.find((s: Setting) => s.type === 'ORDER_EMAIL');
      const orderEmailToSetting = settings.find((s: Setting) => s.type === 'ORDER_EMAIL_TO');
      const orderEmailPasswordSetting = settings.find((s: Setting) => s.type === 'ORDER_EMAIL_PASSWORD');
      const smtpHostSetting = settings.find((s: Setting) => s.type === 'SMTP_HOST');
      const smtpPortSetting = settings.find((s: Setting) => s.type === 'SMTP_PORT');
      const deliveryAmountSetting = settings.find((s: Setting) => s.type === 'DELIVERY_AMOUNT');
      const postcardAmountSetting = settings.find((s: Setting) => s.type === 'POSTCARD_AMOUNT');
      const workTimeFromSetting = settings.find((s: Setting) => s.type === 'WORK_TIME_FROM');
      const workTimeToSetting = settings.find((s: Setting) => s.type === 'WORK_TIME_TO');

      setSupportChatId(supportSetting?.value || '');
      setManagerChatId(managerSetting?.value || '');
      setOrderEmail(orderEmailSetting?.value || '');
      setOrderEmailTo(orderEmailToSetting?.value || '');
      setOrderEmailPassword(orderEmailPasswordSetting?.value || '');
      setSmtpHost(smtpHostSetting?.value || '');
      setSmtpPort(smtpPortSetting?.value || '');
      setDeliveryAmount(deliveryAmountSetting?.value || '');
      setPostcardAmount(postcardAmountSetting?.value || '');
      setWorkTimeFrom(workTimeFromSetting?.value || '');
      setWorkTimeTo(workTimeToSetting?.value || '');
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError('Не удалось загрузить настройки');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    if (!initData) return;

    try {
      const cats = await fetchAllCategories(initData);
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  // Category handlers
  const handleEditCategory = (category: CategoryDTO) => {
    setEditingCategoryId(category.id);
    setEditingCategoryTitle(category.title);
  };

  const handleSaveCategory = async () => {
    if (!initData || editingCategoryId === null || !editingCategoryTitle.trim()) return;

    setIsSaving(true);
    try {
      await updateCategory(editingCategoryId, editingCategoryTitle.trim(), initData);
      await loadCategories();
      setEditingCategoryId(null);
      setEditingCategoryTitle('');
    } catch (err) {
      console.error('Failed to update category:', err);
      setError('Ошибка при обновлении категории');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    if (!initData) return;
    if (!confirm('Удалить категорию?')) return;

    setIsSaving(true);
    try {
      await deleteCategory(categoryId, initData);
      await loadCategories();
    } catch (err) {
      console.error('Failed to delete category:', err);
      setError('Ошибка при удалении категории');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCategory = async () => {
    if (!initData || !newCategoryTitle.trim()) return;

    setIsSaving(true);
    try {
      await createCategory(newCategoryTitle.trim(), initData);
      await loadCategories();
      setNewCategoryTitle('');
      setIsAddingCategory(false);
    } catch (err) {
      console.error('Failed to create category:', err);
      setError('Ошибка при создании категории');
    } finally {
      setIsSaving(false);
    }
  };

  // User search and update handlers
  const handleSearchUser = async () => {
    if (!initData || !searchUsername.trim()) return;

    setIsSearching(true);
    setError(null);
    setFoundUser(null);

    try {
      const user = await fetchUserByUsername(searchUsername.trim(), initData);
      setFoundUser(user);
      setEditUserRole(user.role);
      setEditUserMode(user.mode);
    } catch (err) {
      console.error('Failed to find user:', err);
      setError('Пользователь не найден');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSaveUser = async () => {
    if (!initData || !foundUser) return;

    setIsSaving(true);
    setError(null);

    try {
      const updatedUser = await updateUser(foundUser.id, editUserRole, editUserMode, initData);
      setFoundUser(updatedUser);
      alert('Пользователь успешно обновлён!');
    } catch (err) {
      console.error('Failed to update user:', err);
      setError('Ошибка при обновлении пользователя');
    } finally {
      setIsSaving(false);
    }
  };

  const handleModeToggle = () => {
    const newMode = currentMode === 'ADMIN' ? 'USER' : 'ADMIN';
    setCurrentMode(newMode);
  };

  const handleSave = async () => {
    if (!initData) {
      setError('Ошибка авторизации');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Update mode if changed
      if (currentMode !== userMode) {
        await updateUserMode(currentMode, initData);

        // Notify parent to reload user info
        if (onModeChange) {
          onModeChange();
        }
      }

      // Save support chat ID (empty -> delete)
      const supportChatIdValue = supportChatId.trim();
      if (supportChatIdValue) {
        await upsertSetting('SUPPORT_CHAT_ID', supportChatIdValue, initData);
        existingSettingTypesRef.current.add('SUPPORT_CHAT_ID');
      } else if (existingSettingTypesRef.current.has('SUPPORT_CHAT_ID')) {
        await deleteSetting('SUPPORT_CHAT_ID', initData);
        existingSettingTypesRef.current.delete('SUPPORT_CHAT_ID');
      }

      // Save manager chat ID (empty -> delete)
      const managerChatIdValue = managerChatId.trim();
      if (managerChatIdValue) {
        // Validate: digits with optional minus sign (for groups/supergroups)
        if (!/^-?\d+$/.test(managerChatIdValue)) {
          setError('ID чата менеджера должен быть числом (может быть отрицательным)');
          setIsSaving(false);
          return;
        }
        await upsertSetting('MANAGER_CHAT_ID', managerChatIdValue, initData);
        existingSettingTypesRef.current.add('MANAGER_CHAT_ID');
      } else if (existingSettingTypesRef.current.has('MANAGER_CHAT_ID')) {
        await deleteSetting('MANAGER_CHAT_ID', initData);
        existingSettingTypesRef.current.delete('MANAGER_CHAT_ID');
      }

      // Save order email (empty -> delete)
      const orderEmailValue = orderEmail.trim();
      if (orderEmailValue) {
        await upsertSetting('ORDER_EMAIL', orderEmailValue, initData);
        existingSettingTypesRef.current.add('ORDER_EMAIL');
      } else if (existingSettingTypesRef.current.has('ORDER_EMAIL')) {
        await deleteSetting('ORDER_EMAIL', initData);
        existingSettingTypesRef.current.delete('ORDER_EMAIL');
      }

      // Save order email to (empty -> delete)
      const orderEmailToValue = orderEmailTo.trim();
      if (orderEmailToValue) {
        await upsertSetting('ORDER_EMAIL_TO', orderEmailToValue, initData);
        existingSettingTypesRef.current.add('ORDER_EMAIL_TO');
      } else if (existingSettingTypesRef.current.has('ORDER_EMAIL_TO')) {
        await deleteSetting('ORDER_EMAIL_TO', initData);
        existingSettingTypesRef.current.delete('ORDER_EMAIL_TO');
      }

      // Save order email password (empty -> delete)
      const orderEmailPasswordValue = orderEmailPassword.trim();
      if (orderEmailPasswordValue) {
        await upsertSetting('ORDER_EMAIL_PASSWORD', orderEmailPasswordValue, initData);
        existingSettingTypesRef.current.add('ORDER_EMAIL_PASSWORD');
      } else if (existingSettingTypesRef.current.has('ORDER_EMAIL_PASSWORD')) {
        await deleteSetting('ORDER_EMAIL_PASSWORD', initData);
        existingSettingTypesRef.current.delete('ORDER_EMAIL_PASSWORD');
      }

      // Save SMTP host (empty -> delete)
      const smtpHostValue = smtpHost.trim();
      if (smtpHostValue) {
        await upsertSetting('SMTP_HOST', smtpHostValue, initData);
        existingSettingTypesRef.current.add('SMTP_HOST');
      } else if (existingSettingTypesRef.current.has('SMTP_HOST')) {
        await deleteSetting('SMTP_HOST', initData);
        existingSettingTypesRef.current.delete('SMTP_HOST');
      }

      // Save SMTP port (empty -> delete)
      const smtpPortValue = smtpPort.trim();
      if (smtpPortValue) {
        // Validate: digits only
        if (!/^\d+$/.test(smtpPortValue)) {
          setError('SMTP порт должен быть числом');
          setIsSaving(false);
          return;
        }
        await upsertSetting('SMTP_PORT', smtpPortValue, initData);
        existingSettingTypesRef.current.add('SMTP_PORT');
      } else if (existingSettingTypesRef.current.has('SMTP_PORT')) {
        await deleteSetting('SMTP_PORT', initData);
        existingSettingTypesRef.current.delete('SMTP_PORT');
      }

      // Save delivery amount (empty -> delete)
      const deliveryAmountValue = deliveryAmount.trim();
      if (deliveryAmountValue) {
        // Validate: digits only (рубли)
        if (!/^\d+$/.test(deliveryAmountValue)) {
          setError('Стоимость доставки должна быть числом');
          setIsSaving(false);
          return;
        }
        await upsertSetting('DELIVERY_AMOUNT', deliveryAmountValue, initData);
        existingSettingTypesRef.current.add('DELIVERY_AMOUNT');
      } else if (existingSettingTypesRef.current.has('DELIVERY_AMOUNT')) {
        await deleteSetting('DELIVERY_AMOUNT', initData);
        existingSettingTypesRef.current.delete('DELIVERY_AMOUNT');
      }

      // Save postcard amount (empty -> delete)
      const postcardAmountValue = postcardAmount.trim();
      if (postcardAmountValue) {
        // Validate: digits only (рубли)
        if (!/^\d+$/.test(postcardAmountValue)) {
          setError('Стоимость открытки должна быть числом');
          setIsSaving(false);
          return;
        }
        await upsertSetting('POSTCARD_AMOUNT', postcardAmountValue, initData);
        existingSettingTypesRef.current.add('POSTCARD_AMOUNT');
      } else if (existingSettingTypesRef.current.has('POSTCARD_AMOUNT')) {
        await deleteSetting('POSTCARD_AMOUNT', initData);
        existingSettingTypesRef.current.delete('POSTCARD_AMOUNT');
      }

      // Save work time settings (can be empty -> treated as 24/7 in cart; empty -> delete)
      const wtFrom = workTimeFrom.trim();
      const wtTo = workTimeTo.trim();

      if (wtFrom && !/^\d+$/.test(wtFrom)) {
        setError('WORK_TIME_FROM должен быть числом (час)');
        setIsSaving(false);
        return;
      }

      if (wtTo && !/^\d+$/.test(wtTo)) {
        setError('WORK_TIME_TO должен быть числом (час)');
        setIsSaving(false);
        return;
      }

      if (wtFrom && wtTo) {
        const fromNum = parseInt(wtFrom, 10);
        const toNum = parseInt(wtTo, 10);

        if (fromNum < 0 || fromNum > 23) {
          setError('WORK_TIME_FROM должен быть в диапазоне 0–23');
          setIsSaving(false);
          return;
        }

        if (toNum < 1 || toNum > 24) {
          setError('WORK_TIME_TO должен быть в диапазоне 1–24');
          setIsSaving(false);
          return;
        }

        if (fromNum >= toNum) {
          setError('WORK_TIME_FROM должен быть меньше чем WORK_TIME_TO');
          setIsSaving(false);
          return;
        }
      }

      if (wtFrom) {
        await upsertSetting('WORK_TIME_FROM', wtFrom, initData);
        existingSettingTypesRef.current.add('WORK_TIME_FROM');
      } else if (existingSettingTypesRef.current.has('WORK_TIME_FROM')) {
        await deleteSetting('WORK_TIME_FROM', initData);
        existingSettingTypesRef.current.delete('WORK_TIME_FROM');
      }

      if (wtTo) {
        await upsertSetting('WORK_TIME_TO', wtTo, initData);
        existingSettingTypesRef.current.add('WORK_TIME_TO');
      } else if (existingSettingTypesRef.current.has('WORK_TIME_TO')) {
        await deleteSetting('WORK_TIME_TO', initData);
        existingSettingTypesRef.current.delete('WORK_TIME_TO');
      }

      // Success - keep settings open (don't navigate away)
      alert('Настройки успешно сохранены!');
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError('Ошибка при сохранении настроек');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white z-50 max-w-[402px] mx-auto">
      <div className="h-full overflow-y-auto overflow-x-hidden">
        {/* Header */}
        <AppHeader
          title="FanFanTulpan"
          actionType="menu-text"
          onAction={onMenuClick}
        />

        {/* Page Title */}
        <div className="px-6 mt-[30px]">
          <h1 className="text-2xl font-normal text-black">Настройки</h1>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center mt-[50px]">
            <p className="text-gray-medium">Загрузка настроек...</p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="flex justify-center items-center px-6 mt-4">
            <p className="text-red-500 text-center">{error}</p>
          </div>
        )}

        {/* Settings Form */}
        {!isLoading && (
          <div className="flex flex-col gap-6 px-6 mt-[25px] pb-6">
            {/* Mode Toggle */}
            <div className="flex flex-col gap-3">
              <label className="text-base font-semibold text-black">
                Режим
              </label>
              <div className="flex items-center gap-3">
                <span className={`text-sm ${currentMode === 'USER' ? 'font-semibold' : 'font-normal text-gray-medium'}`}>
                  Пользователь
                </span>
                <button
                  onClick={handleModeToggle}
                  disabled={isSaving}
                  className={`relative w-[60px] h-[32px] rounded-full transition-colors ${
                    currentMode === 'ADMIN' ? 'bg-teal' : 'bg-gray-300'
                  } disabled:opacity-50`}
                >
                  <div
                    className={`absolute top-[4px] w-[24px] h-[24px] bg-white rounded-full shadow-md transition-transform ${
                      currentMode === 'ADMIN' ? 'translate-x-[32px]' : 'translate-x-[4px]'
                    }`}
                  />
                </button>
                <span className={`text-sm ${currentMode === 'ADMIN' ? 'font-semibold' : 'font-normal text-gray-medium'}`}>
                  Администратор
                </span>
              </div>
            </div>

            {/* Tabs */}
            <div className="overflow-x-auto overscroll-x-contain">
              <div className="flex gap-2 min-w-max">
                <button
                  onClick={() => setActiveTab('notifications')}
                  className={`flex-1 py-2 px-3 rounded-[20px] text-sm font-medium transition-colors ${
                    activeTab === 'notifications'
                      ? 'bg-teal text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  Уведомления
                </button>
                <button
                  onClick={() => setActiveTab('delivery')}
                  className={`flex-1 py-2 px-3 rounded-[20px] text-sm font-medium transition-colors ${
                    activeTab === 'delivery'
                      ? 'bg-teal text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  Доставка
                </button>
                <button
                  onClick={() => setActiveTab('categories')}
                  className={`flex-1 py-2 px-3 rounded-[20px] text-sm font-medium transition-colors ${
                    activeTab === 'categories'
                      ? 'bg-teal text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  Категории
                </button>
                <button
                  onClick={() => setActiveTab('users')}
                  className={`flex-1 py-2 px-3 rounded-[20px] text-sm font-medium transition-colors ${
                    activeTab === 'users'
                      ? 'bg-teal text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  Пользователи
                </button>
              </div>
            </div>

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <>
                {/* Support Chat ID */}
                <div className="flex flex-col gap-3">
                  <label className="text-base font-semibold text-black">
                    Чат службы поддержки
                  </label>
                  <input
                    type="text"
                    value={supportChatId}
                    onChange={(e) => setSupportChatId(e.target.value)}
                    disabled={isSaving}
                    className="w-full px-4 py-3 border border-gray-300 rounded-[20px] focus:outline-none focus:border-teal disabled:opacity-50"
                  />
                </div>

                {/* Manager Chat ID */}
                <div className="flex flex-col gap-3">
                  <label className="text-base font-semibold text-black">
                    ID чата менеджера
                  </label>
                  <input
                    type="text"
                    value={managerChatId}
                    onChange={(e) => setManagerChatId(e.target.value)}
                    disabled={isSaving}
                    className="w-full px-4 py-3 border border-gray-300 rounded-[20px] focus:outline-none focus:border-teal disabled:opacity-50"
                  />
                </div>

                {/* Order Email */}
                <div className="flex flex-col gap-3">
                  <label className="text-base font-semibold text-black">
                    Почта для отправки заказов
                  </label>
                  <input
                    type="email"
                    value={orderEmail}
                    onChange={(e) => setOrderEmail(e.target.value)}
                    disabled={isSaving}
                    placeholder="shop@gmail.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-[20px] focus:outline-none focus:border-teal disabled:opacity-50"
                  />
                </div>

                {/* Order Email To */}
                <div className="flex flex-col gap-3">
                  <label className="text-base font-semibold text-black">
                    Почта получатель
                  </label>
                  <input
                    type="email"
                    value={orderEmailTo}
                    onChange={(e) => setOrderEmailTo(e.target.value)}
                    disabled={isSaving}
                    placeholder="manager@gmail.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-[20px] focus:outline-none focus:border-teal disabled:opacity-50"
                  />
                </div>

                {/* Order Email Password */}
                <div className="flex flex-col gap-3">
                  <label className="text-base font-semibold text-black">
                    Пароль от почты
                  </label>
                  <input
                    type="password"
                    value={orderEmailPassword}
                    onChange={(e) => setOrderEmailPassword(e.target.value)}
                    disabled={isSaving}
                    className="w-full px-4 py-3 border border-gray-300 rounded-[20px] focus:outline-none focus:border-teal disabled:opacity-50"
                  />
                </div>

                {/* SMTP Host */}
                <div className="flex flex-col gap-3">
                  <label className="text-base font-semibold text-black">
                    SMTP сервер
                  </label>
                  <input
                    type="text"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    disabled={isSaving}
                    className="w-full px-4 py-3 border border-gray-300 rounded-[20px] focus:outline-none focus:border-teal disabled:opacity-50"
                  />
                </div>

                {/* SMTP Port */}
                <div className="flex flex-col gap-3">
                  <label className="text-base font-semibold text-black">
                    SMTP порт
                  </label>
                  <input
                    type="text"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    disabled={isSaving}
                    placeholder="587"
                    className="w-full px-4 py-3 border border-gray-300 rounded-[20px] focus:outline-none focus:border-teal disabled:opacity-50"
                  />
                </div>

                {/* Save Button */}
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full bg-teal text-white py-3 rounded-[30px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 mt-4"
                >
                  {isSaving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </>
            )}

            {/* Delivery Tab */}
            {activeTab === 'delivery' && (
              <>
                <div className="flex flex-col gap-3">
                  <label className="text-base font-semibold text-black">
                    Стоимость доставки
                  </label>
                  <input
                    type="text"
                    value={deliveryAmount}
                    onChange={(e) => setDeliveryAmount(e.target.value)}
                    disabled={isSaving}
                    inputMode="numeric"
                    placeholder="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-[20px] focus:outline-none focus:border-teal disabled:opacity-50"
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <label className="text-base font-semibold text-black">
                    Стоимость открытки
                  </label>
                  <input
                    type="text"
                    value={postcardAmount}
                    onChange={(e) => setPostcardAmount(e.target.value)}
                    disabled={isSaving}
                    inputMode="numeric"
                    placeholder="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-[20px] focus:outline-none focus:border-teal disabled:opacity-50"
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <label className="text-base font-semibold text-black">
                    Часы работы
                  </label>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">От</label>
                      <input
                        type="text"
                        value={workTimeFrom}
                        onChange={(e) => setWorkTimeFrom(e.target.value)}
                        disabled={isSaving}
                        inputMode="numeric"
                        placeholder="0"
                        className="w-full px-4 py-3 border border-gray-300 rounded-[20px] focus:outline-none focus:border-teal disabled:opacity-50"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">До</label>
                      <input
                        type="text"
                        value={workTimeTo}
                        onChange={(e) => setWorkTimeTo(e.target.value)}
                        disabled={isSaving}
                        inputMode="numeric"
                        placeholder="24"
                        className="w-full px-4 py-3 border border-gray-300 rounded-[20px] focus:outline-none focus:border-teal disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full bg-teal text-white py-3 rounded-[30px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 mt-4"
                >
                  {isSaving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </>
            )}

            {/* Categories Tab */}
            {activeTab === 'categories' && (
              <div className="flex flex-col gap-4">
                {/* Add Category Button */}
                {!isAddingCategory ? (
                  <button
                    onClick={() => setIsAddingCategory(true)}
                    disabled={isSaving}
                    className="w-full border-2 border-dashed border-gray-300 text-gray-500 py-3 rounded-[20px] hover:border-teal hover:text-teal transition-colors disabled:opacity-50"
                  >
                    + Добавить категорию
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCategoryTitle}
                      onChange={(e) => setNewCategoryTitle(e.target.value)}
                      placeholder="Название категории"
                      disabled={isSaving}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-[20px] focus:outline-none focus:border-teal disabled:opacity-50"
                      autoFocus
                    />
                    <button
                      onClick={handleAddCategory}
                      disabled={isSaving || !newCategoryTitle.trim()}
                      className="px-4 py-2 bg-teal text-white rounded-[20px] disabled:opacity-50"
                    >
                      OK
                    </button>
                    <button
                      onClick={() => {
                        setIsAddingCategory(false);
                        setNewCategoryTitle('');
                      }}
                      disabled={isSaving}
                      className="px-4 py-2 bg-gray-200 text-gray-600 rounded-[20px] disabled:opacity-50"
                    >
                      X
                    </button>
                  </div>
                )}

                {/* Categories List */}
                {categories.length === 0 ? (
                  <p className="text-gray-medium text-center py-4">Нет категорий</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {categories.map((category) => (
                      <div
                        key={category.id}
                        className="flex items-center gap-2 p-3 bg-gray-50 rounded-[20px]"
                      >
                        {editingCategoryId === category.id ? (
                          <>
                            <input
                              type="text"
                              value={editingCategoryTitle}
                              onChange={(e) => setEditingCategoryTitle(e.target.value)}
                              disabled={isSaving}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-[15px] focus:outline-none focus:border-teal disabled:opacity-50"
                              autoFocus
                            />
                            <button
                              onClick={handleSaveCategory}
                              disabled={isSaving || !editingCategoryTitle.trim()}
                              className="px-3 py-2 bg-teal text-white text-sm rounded-[15px] disabled:opacity-50"
                            >
                              OK
                            </button>
                            <button
                              onClick={() => {
                                setEditingCategoryId(null);
                                setEditingCategoryTitle('');
                              }}
                              disabled={isSaving}
                              className="px-3 py-2 bg-gray-200 text-gray-600 text-sm rounded-[15px] disabled:opacity-50"
                            >
                              X
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-black">{category.title}</span>
                            <button
                              onClick={() => handleEditCategory(category)}
                              disabled={isSaving}
                              className="p-2 text-gray-500 hover:text-teal disabled:opacity-50"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(category.id)}
                              disabled={isSaving}
                              className="p-2 text-gray-500 hover:text-red-500 disabled:opacity-50"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="flex flex-col gap-4">
                {/* Search User */}
                <div className="flex flex-col gap-3">
                  <label className="text-base font-semibold text-black">
                    Пользователь
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchUsername}
                      onChange={(e) => setSearchUsername(e.target.value)}
                      placeholder="Введите username"
                      disabled={isSearching || isSaving}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-[20px] focus:outline-none focus:border-teal disabled:opacity-50"
                    />
                    <button
                      onClick={handleSearchUser}
                      disabled={isSearching || isSaving || !searchUsername.trim()}
                      className="px-4 py-3 bg-teal text-white rounded-[20px] disabled:opacity-50"
                    >
                      {isSearching ? '...' : 'Показать'}
                    </button>
                  </div>
                </div>

                {/* User Info */}
                {foundUser && (
                  <div className="flex flex-col gap-4 p-4 bg-gray-50 rounded-[20px]">
                    {/* User ID */}
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-gray-medium">ID пользователя</span>
                      <span className="text-base font-medium text-black">{foundUser.id}</span>
                    </div>

                    {/* User Role */}
                    <div className="flex flex-col gap-2">
                      <span className="text-sm text-gray-medium">Роль пользователя</span>
                      <div className="flex items-center gap-3">
                        <span className={`text-sm ${editUserRole === 'USER' ? 'font-semibold' : 'font-normal text-gray-medium'}`}>
                          Пользователь
                        </span>
                        <button
                          onClick={() => setEditUserRole(editUserRole === 'ADMIN' ? 'USER' : 'ADMIN')}
                          disabled={isSaving}
                          className={`relative w-[60px] h-[32px] rounded-full transition-colors ${
                            editUserRole === 'ADMIN' ? 'bg-teal' : 'bg-gray-300'
                          } disabled:opacity-50`}
                        >
                          <div
                            className={`absolute top-[4px] w-[24px] h-[24px] bg-white rounded-full shadow-md transition-transform ${
                              editUserRole === 'ADMIN' ? 'translate-x-[32px]' : 'translate-x-[4px]'
                            }`}
                          />
                        </button>
                        <span className={`text-sm ${editUserRole === 'ADMIN' ? 'font-semibold' : 'font-normal text-gray-medium'}`}>
                          Администратор
                        </span>
                      </div>
                    </div>

                    {/* Save Button */}
                    <button
                      onClick={handleSaveUser}
                      disabled={isSaving}
                      className="w-full bg-teal text-white py-3 rounded-[30px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 mt-2"
                    >
                      {isSaving ? 'Сохранение...' : 'Сохранить'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
