import React, { useState, useRef, useEffect } from 'react';
import { Product } from './ProductGrid';
import { reorderGoodImages, fetchCategories, CategoryDTO, deleteGoodImage } from '../api/client';

interface AdminProductCardProps {
  onClose: () => void;
  onSave: (data: {
    id?: number;
    name: string;
    category: string;
    price: number;
    non_discount_price?: number;
    description: string;
    imageFiles: File[];
    sort_order?: number;
  }) => void;
  editingProduct?: Product;
  onDelete?: () => void;
  onBlock?: () => void;
}

const AdminProductCard: React.FC<AdminProductCardProps> = ({ onClose, onSave, editingProduct, onDelete, onBlock }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [priceRub, setPriceRub] = useState('');
  const [nonDiscountPriceRub, setNonDiscountPriceRub] = useState('');
  const [description, setDescription] = useState('');
  const [sortOrder, setSortOrder] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Categories state
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // New category creation state
  const [isCreatingNewCategory, setIsCreatingNewCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const newCategoryInputRef = useRef<HTMLInputElement>(null);

  // Drag-and-drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [orderedImageUrls, setOrderedImageUrls] = useState<string[]>([]);

  // Touch state for mobile
  const [touchStartIndex, setTouchStartIndex] = useState<number | null>(null);

  // Mouse state for desktop
  const [mouseStartIndex, setMouseStartIndex] = useState<number | null>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    imageUrl: string | null;
    imageIndex: number | null;
  }>({ visible: false, x: 0, y: 0, imageUrl: null, imageIndex: null });

  // Image swipe state
  const [imageSwipeStartX, setImageSwipeStartX] = useState<number | null>(null);

  const longPressTimerRef = useRef<number | null>(null);

  // При редактировании заполняем форму данными товара
  useEffect(() => {
    if (editingProduct) {
      setName(editingProduct.title);
      setCategory(editingProduct.category || '');
      // Извлекаем числовое значение из строки "2999 руб."
      const priceMatch = editingProduct.price.match(/\d+/);
      if (priceMatch) {
        setPriceRub(priceMatch[0]);
      }
      // Извлекаем числовое значение для non_discount_price если есть
      if (editingProduct.non_discount_price) {
        const nonDiscountMatch = editingProduct.non_discount_price.match(/\d+/);
        if (nonDiscountMatch) {
          setNonDiscountPriceRub(nonDiscountMatch[0]);
        }
      } else {
        setNonDiscountPriceRub('');
      }
      setDescription(editingProduct.description);
      // Устанавливаем sort_order
      if (editingProduct.sort_order !== undefined) {
        setSortOrder(String(editingProduct.sort_order));
      } else {
        setSortOrder('');
      }

      // Устанавливаем превью изображений из товара (не File, а URL)
      if (editingProduct.images && editingProduct.images.length > 0) {
        setPreviewUrls(editingProduct.images);
        setOrderedImageUrls(editingProduct.images);
      } else if (editingProduct.image) {
        setPreviewUrls([editingProduct.image]);
        setOrderedImageUrls([editingProduct.image]);
      }
    }
  }, [editingProduct]);

  // Debug: отслеживаем изменения orderedImageUrls
  useEffect(() => {
    console.log('🔄 orderedImageUrls changed:', orderedImageUrls);
  }, [orderedImageUrls]);

  // Fetch categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setCategoriesLoading(true);
        const fetchedCategories = await fetchCategories();
        setCategories(fetchedCategories);
      } catch (error) {
        alert('Не удалось загрузить категории');
      } finally {
        setCategoriesLoading(false);
      }
    };

    loadCategories();
  }, []);

  // Global mouse listeners for drag functionality
  useEffect(() => {
    if (mouseStartIndex !== null) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [mouseStartIndex, dragOverIndex, orderedImageUrls]);

  // Auto-focus on new category input when entering creation mode
  useEffect(() => {
    if (isCreatingNewCategory && newCategoryInputRef.current) {
      newCategoryInputRef.current.focus();
    }
  }, [isCreatingNewCategory]);

  // Close context menu on click outside
  useEffect(() => {
    if (contextMenu.visible) {
      const handleClickOutside = () => {
        handleCloseContextMenu();
      };
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [contextMenu.visible]);

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  // Handle category dropdown change
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === '__create_new__') {
      // Switch to input mode for creating new category
      setIsCreatingNewCategory(true);
      setNewCategoryInput('');
    } else {
      setCategory(value);
    }
  };

  // Handle new category input confirmation
  const handleNewCategoryConfirm = () => {
    const trimmedInput = newCategoryInput.trim();
    if (trimmedInput) {
      // Check if category already exists in the list
      const categoryExists = categories.some(cat => cat.title === trimmedInput);

      // Set the new category as selected
      setCategory(trimmedInput);

      // Add to categories list if it doesn't exist (for immediate UI feedback)
      if (!categoryExists) {
        const newCategory: CategoryDTO = {
          id: 0, // Temporary ID, will be created on backend
          title: trimmedInput,
          status: 'NEW'
        };
        setCategories(prev => [...prev, newCategory]);
      }
    }
    // Exit creation mode and reset input
    setIsCreatingNewCategory(false);
    setNewCategoryInput('');
  };

  // Handle Enter key in new category input
  const handleNewCategoryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleNewCategoryConfirm();
    } else if (e.key === 'Escape') {
      // Cancel creation on Escape
      setIsCreatingNewCategory(false);
      setNewCategoryInput('');
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);

    // Validate each file
    for (const file of fileArray) {
      if (file.size > 5 * 1024 * 1024) {
        alert(`Размер файла ${file.name} не должен превышать 5MB`);
        return;
      }

      if (!file.type.startsWith('image/')) {
        alert(`Файл ${file.name} должен быть изображением`);
        return;
      }
    }

    // Create preview URLs for all files
    const urls = fileArray.map(file => URL.createObjectURL(file));

    setSelectedFiles(fileArray);
    setPreviewUrls(urls);
    setCurrentPreviewIndex(0);
  };

  // Touch handlers for mobile devices
  const handleTouchStart = (index: number) => {
    setTouchStartIndex(index);
    setDraggedIndex(index);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartIndex === null) return;

    // Get touch position
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);

    // Find which preview element we're over
    if (element) {
      const previewElement = element.closest('[data-preview-index]');
      if (previewElement) {
        const index = parseInt(previewElement.getAttribute('data-preview-index') || '-1');
        if (index !== -1 && index !== dragOverIndex) {
          console.log('👉 Touch Move Over:', index);
          setDragOverIndex(index);
        }
      }
    }
  };

  const handleTouchEnd = () => {

    if (touchStartIndex === null || dragOverIndex === null || touchStartIndex === dragOverIndex) {
      setTouchStartIndex(null);
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newOrder = [...orderedImageUrls];
    const draggedItem = newOrder[touchStartIndex];


    // Remove item from old position
    newOrder.splice(touchStartIndex, 1);
    // Insert at new position
    newOrder.splice(dragOverIndex, 0, draggedItem);


    setOrderedImageUrls(newOrder);
    setTouchStartIndex(null);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Mouse handlers for desktop devices
  const handleMouseDown = (index: number) => {
    console.log('🖱️ Mouse Down:', index);
    setMouseStartIndex(index);
    setDraggedIndex(index);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (mouseStartIndex === null) return;

    // Get mouse position
    const element = document.elementFromPoint(e.clientX, e.clientY);

    // Find which preview element we're over
    if (element) {
      const previewElement = element.closest('[data-preview-index]');
      if (previewElement) {
        const index = parseInt(previewElement.getAttribute('data-preview-index') || '-1');
        if (index !== -1 && index !== dragOverIndex) {
          console.log('🖱️ Mouse Move Over:', index);
          setDragOverIndex(index);
        }
      }
    }
  };

  const handleMouseUp = () => {
    console.log('🖱️ Mouse Up:', { mouseStartIndex, dragOverIndex });

    if (mouseStartIndex === null || dragOverIndex === null || mouseStartIndex === dragOverIndex) {
      console.log('⚠️ Mouse Cancelled: same index or null');
      setMouseStartIndex(null);
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newOrder = [...orderedImageUrls];
    const draggedItem = newOrder[mouseStartIndex];

    // Remove item from old position
    newOrder.splice(mouseStartIndex, 1);
    // Insert at new position
    newOrder.splice(dragOverIndex, 0, draggedItem);

    setOrderedImageUrls(newOrder);
    setMouseStartIndex(null);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Long press handler for mobile devices
  const handleLongPressStart = (index: number, url: string, e: React.TouchEvent) => {
    const touch = e.touches[0];
    longPressTimerRef.current = window.setTimeout(() => {
      setContextMenu({
        visible: true,
        x: touch.clientX,
        y: touch.clientY,
        imageUrl: url,
        imageIndex: index,
      });
    }, 3000); // 3 seconds
  };

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Right-click handler for desktop
  const handleContextMenu = (index: number, url: string, e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      imageUrl: url,
      imageIndex: index,
    });
  };

  // Close context menu
  const handleCloseContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, imageUrl: null, imageIndex: null });
  };

  // Image swipe handlers for main preview
  const handleImageSwipeStart = (e: React.TouchEvent) => {
    setImageSwipeStartX(e.touches[0].clientX);
  };

  const handleImageSwipeEnd = (e: React.TouchEvent) => {
    if (imageSwipeStartX === null || previewUrls.length <= 1) return;

    const endX = e.changedTouches[0].clientX;
    const distance = endX - imageSwipeStartX;
    const threshold = 50;

    if (distance > threshold) {
      // Swipe right - previous image
      setCurrentPreviewIndex(prev => prev === 0 ? previewUrls.length - 1 : prev - 1);
    } else if (distance < -threshold) {
      // Swipe left - next image
      setCurrentPreviewIndex(prev => prev === previewUrls.length - 1 ? 0 : prev + 1);
    }

    setImageSwipeStartX(null);
  };

  // Handle image deletion
  const handleDeleteImage = async () => {
    if (!contextMenu.imageUrl || !editingProduct) {
      return;
    }

    try {
      const initData = window.Telegram?.WebApp?.initData || '';
      if (!initData) {
        alert('Не удалось получить данные авторизации');
        return;
      }

      // Delete from backend
      await deleteGoodImage(editingProduct.id, contextMenu.imageUrl, initData);

      // Update local state
      const newOrderedUrls = orderedImageUrls.filter(url => url !== contextMenu.imageUrl);
      setOrderedImageUrls(newOrderedUrls);
      setPreviewUrls(newOrderedUrls);

      // Close context menu
      handleCloseContextMenu();

      alert('Изображение удалено');
    } catch (error) {
      console.error('Failed to delete image:', error);
      alert('Не удалось удалить изображение');
    }
  };

  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      alert('Введите название товара');
      return;
    }

    if (!category.trim()) {
      alert('Выберите категорию товара');
      return;
    }

    if (!priceRub.trim() || isNaN(Number(priceRub)) || Number(priceRub) <= 0) {
      alert('Введите корректную цену');
      return;
    }

    if (!description.trim()) {
      alert('Введите описание товара');
      return;
    }

    // Price is stored as integer rubles
    const price = Math.round(Number(priceRub));

    // Non-discount price is optional
    const nonDiscountPrice = nonDiscountPriceRub.trim() && !isNaN(Number(nonDiscountPriceRub))
      ? Math.round(Number(nonDiscountPriceRub))
      : undefined;

    // Sort order is optional
    const sortOrderValue = sortOrder.trim() && !isNaN(Number(sortOrder))
      ? Math.round(Number(sortOrder))
      : undefined;

    onSave({
      id: editingProduct?.id,
      name: name.trim(),
      category: category,
      price: price,
      description: description.trim(),
      imageFiles: selectedFiles,
      non_discount_price: nonDiscountPrice,
      sort_order: sortOrderValue,
    });

    // Check if image order changed and update if needed
    if (editingProduct && editingProduct.images && orderedImageUrls.length > 0) {
      const originalOrder = editingProduct.images;
      const orderChanged = !originalOrder.every((url, index) => url === orderedImageUrls[index]);

      if (orderChanged) {
        try {
          const initData = window.Telegram?.WebApp?.initData || '';
          if (!initData) {
            alert('Не удалось получить данные авторизации');
            return;
          }

          await reorderGoodImages(editingProduct.id, orderedImageUrls, initData);
        } catch (error) {
          console.error('Failed to reorder images:', error);
          alert('Не удалось обновить порядок изображений');
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-50 max-w-[402px] mx-auto overflow-y-auto">
      <div className="min-h-full flex flex-col">
        {/* Image Placeholder Section */}
        <div
          className="relative h-[505px] flex-shrink-0 bg-gray-light flex items-center justify-center rounded-b-[30px] cursor-pointer"
          onClick={handleImageClick}
        >
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />

          {previewUrls.length > 0 ? (
            <div
              className="w-full h-full"
              onTouchStart={handleImageSwipeStart}
              onTouchEnd={handleImageSwipeEnd}
            >
              <img
                src={previewUrls[currentPreviewIndex]}
                alt={`Preview ${currentPreviewIndex + 1}`}
                className="w-full h-full object-cover rounded-b-[30px]"
              />

              {/* Navigation arrows for multiple images */}
              {previewUrls.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentPreviewIndex(prev => prev === 0 ? previewUrls.length - 1 : prev - 1);
                    }}
                    className="absolute top-[245px] left-2 w-[50px] h-[50px] flex items-center justify-center text-gray-300 hover:text-white transition-colors"
                  >
                    <svg width="20" height="36" viewBox="0 0 20 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <mask id="mask0_admin_left" style={{maskType: "alpha"}} maskUnits="userSpaceOnUse" x="-15" y="-9" width="51" height="52">
                        <rect x="-14.8155" y="-8.4654" width="50.7937" height="50.7937" fill="#D9D9D9"/>
                      </mask>
                      <g mask="url(#mask0_admin_left)">
                        <path d="M5.7672 17.9638L19.2064 31.403C19.7355 31.9321 19.9912 32.5494 19.9735 33.2548C19.9559 33.9603 19.6825 34.5776 19.1534 35.1067C18.6243 35.6358 18.0071 35.9003 17.3016 35.9003C16.5961 35.9003 15.9788 35.6358 15.4497 35.1067L1.26984 20.9797C0.846561 20.5564 0.529101 20.0802 0.31746 19.5511C0.10582 19.022 0 18.4929 0 17.9638C0 17.4347 0.10582 16.9056 0.31746 16.3765C0.529101 15.8474 0.846561 15.3712 1.26984 14.9479L15.4497 0.768049C15.9788 0.238948 16.6049 -0.0167833 17.328 0.000853389C18.0511 0.0184901 18.6772 0.291858 19.2064 0.820959C19.7355 1.35006 20 1.96734 20 2.67281C20 3.37828 19.7355 3.99556 19.2064 4.52466L5.7672 17.9638Z" fill="currentColor"/>
                      </g>
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentPreviewIndex(prev => prev === previewUrls.length - 1 ? 0 : prev + 1);
                    }}
                    className="absolute top-[245px] right-2 w-[50px] h-[50px] flex items-center justify-center text-gray-300 hover:text-white transition-colors"
                  >
                    <svg width="20" height="36" viewBox="0 0 20 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <mask id="mask0_admin_right" style={{maskType: "alpha"}} maskUnits="userSpaceOnUse" x="-16" y="-9" width="51" height="52">
                        <rect width="50" height="50" transform="matrix(-1.01587 0 0 1.01587 34.8155 -8.4654)" fill="#D9D9D9"/>
                      </mask>
                      <g mask="url(#mask0_admin_right)">
                        <path d="M14.2328 17.9638L0.793649 31.403C0.26455 31.9321 0.00881619 32.5494 0.0264544 33.2548C0.0440906 33.9603 0.317458 34.5776 0.84656 35.1067C1.37566 35.6358 1.99294 35.9003 2.69841 35.9003C3.40388 35.9003 4.02116 35.6358 4.55026 35.1067L18.7302 20.9797C19.1534 20.5564 19.4709 20.0802 19.6825 19.5511C19.8942 19.022 20 18.4929 20 17.9638C20 17.4347 19.8942 16.9056 19.6825 16.3765C19.4709 15.8474 19.1534 15.3712 18.7302 14.9479L4.55026 0.768049C4.02116 0.238948 3.39506 -0.0167833 2.67196 0.000853389C1.94885 0.0184901 1.32275 0.291858 0.793649 0.820959C0.26455 1.35006 -1.93762e-06 1.96734 -1.93762e-06 2.67281C-1.93762e-06 3.37828 0.26455 3.99556 0.793649 4.52466L14.2328 17.9638Z" fill="currentColor"/>
                      </g>
                    </svg>
                  </button>

                  {/* Pagination dots */}
                  <div className="absolute bottom-[43px] left-1/2 transform -translate-x-1/2 flex gap-5">
                    {previewUrls.map((_, index) => (
                      <div
                        key={index}
                        className={`w-2 h-2 rounded-full ${
                          index === currentPreviewIndex ? 'bg-[#898989]' : 'bg-[#FFF5F5]'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="text-center">
              <svg
                width="64"
                height="64"
                viewBox="0 0 64 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="mx-auto mb-4"
              >
                <path
                  d="M32 42V22M22 32H42"
                  stroke="#A09CAB"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <rect
                  x="8"
                  y="8"
                  width="48"
                  height="48"
                  rx="8"
                  stroke="#A09CAB"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
              </svg>
              <p className="text-gray-medium text-base">Добавить фото (можно несколько)</p>
            </div>
          )}
        </div>

        {/* Image Previews - shown only when editing and multiple images */}
        {editingProduct && orderedImageUrls.length > 1 && (
          <div className="px-8 pt-4 pb-2">
            <div className="flex gap-2 overflow-x-auto" onTouchMove={handleTouchMove}>
              {orderedImageUrls.map((url, index) => (
                <div
                  key={`${url}-${index}`}
                  data-preview-index={index}
                  onMouseDown={() => handleMouseDown(index)}
                  onTouchStart={(e) => {
                    handleTouchStart(index);
                    handleLongPressStart(index, url, e);
                  }}
                  onTouchEnd={() => {
                    handleTouchEnd();
                    handleLongPressEnd();
                  }}
                  onTouchMove={handleLongPressEnd}
                  onContextMenu={(e) => handleContextMenu(index, url, e)}
                  className={`relative w-[60px] h-[60px] flex-shrink-0 cursor-move transition-all ${
                    draggedIndex === index ? 'opacity-50 scale-95' : ''
                  } ${
                    dragOverIndex === index && draggedIndex !== index ? 'scale-110' : ''
                  }`}
                >
                  <img
                    src={url}
                    alt={`Preview ${index + 1}`}
                    className={`w-full h-full object-cover rounded-[10px] pointer-events-none ${
                      draggedIndex === index ? 'border-2 border-teal' : ''
                    } ${
                      dragOverIndex === index && draggedIndex !== index ? 'border-2 border-green' : ''
                    }`}
                  />
                  <div className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center pointer-events-none">
                    <span className="text-white text-xs font-semibold">{index + 1}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form Section */}
        <div className="px-8 pt-6 pb-8 flex-1">
          {/* Name Input */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-black mb-2">
              Название *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Название товара"
              className="w-full px-4 py-3 rounded-[20px] bg-gray-light border-none text-base text-black placeholder-gray-medium focus:outline-none focus:ring-2 focus:ring-teal"
            />
          </div>

          {/* Category Select */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-black mb-2">
              Категория *
            </label>
            {isCreatingNewCategory ? (
              <input
                ref={newCategoryInputRef}
                type="text"
                value={newCategoryInput}
                onChange={(e) => setNewCategoryInput(e.target.value)}
                onBlur={handleNewCategoryConfirm}
                onKeyDown={handleNewCategoryKeyDown}
                placeholder="Введите название категории"
                className="w-full px-4 py-3 rounded-[20px] bg-gray-light border-none text-base text-black placeholder-gray-medium focus:outline-none focus:ring-2 focus:ring-teal"
              />
            ) : (
              <select
                value={category}
                onChange={handleCategoryChange}
                disabled={categoriesLoading}
                className="w-full px-4 py-3 rounded-[20px] bg-gray-light border-none text-base text-black focus:outline-none focus:ring-2 focus:ring-teal disabled:opacity-50"
              >
                {categoriesLoading ? (
                  <option value="">Загрузка...</option>
                ) : categories.length === 0 ? (
                  <>
                    <option value="">-</option>
                    <option value="__create_new__">Новая категория</option>
                  </>
                ) : (
                  <>
                    <option value="">-</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.title}>
                        {cat.title}
                      </option>
                    ))}
                    <option value="__create_new__">Новая категория</option>
                  </>
                )}
              </select>
            )}
          </div>

          {/* Non-Discount Price Input */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-black mb-2">
              Цена до скидки (руб.)
            </label>
            <input
                type="number"
                value={nonDiscountPriceRub}
                onChange={(e) => setNonDiscountPriceRub(e.target.value)}
                // placeholder="3999"
                min="0"
                step="1"
                className="w-full px-4 py-3 rounded-[20px] bg-gray-light border-none text-base text-black placeholder-gray-medium focus:outline-none focus:ring-2 focus:ring-teal"
            />
          </div>

          {/* Price Input */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-black mb-2">
              Цена (руб.) *
            </label>
            <input
              type="number"
              value={priceRub}
              onChange={(e) => setPriceRub(e.target.value)}
              // placeholder="2999"
              min="0"
              step="1"
              className="w-full px-4 py-3 rounded-[20px] bg-gray-light border-none text-base text-black placeholder-gray-medium focus:outline-none focus:ring-2 focus:ring-teal"
            />
          </div>

          {/* Description Textarea */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-black mb-2">
              Описание *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Описание товара"
              rows={4}
              className="w-full px-4 py-3 rounded-[20px] bg-gray-light border-none text-base text-black placeholder-gray-medium focus:outline-none focus:ring-2 focus:ring-teal resize-none"
            />
          </div>

          {/* Sort Order Input */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-black mb-2">
              Позиция карточки
            </label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              min="0"
              step="1"
              className="w-full px-4 py-3 rounded-[20px] bg-gray-light border-none text-base text-black placeholder-gray-medium focus:outline-none focus:ring-2 focus:ring-teal"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-[10px]">
            <button
              onClick={handleSave}
              className="flex-1 h-[66px] bg-teal rounded-[30px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] flex items-center justify-center"
            >
              <span className="text-sm font-semibold leading-[1.174] text-black">Сохранить</span>
            </button>
            <button
              onClick={onClose}
              className="flex-1 h-[66px] bg-gray-light rounded-[30px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] flex items-center justify-center"
            >
              <span className="text-sm font-semibold leading-[1.174] text-black">Отмена</span>
            </button>
          </div>

          {/* Delete and Block Buttons - shown only when editing existing product */}
          {editingProduct && (onDelete || onBlock) && (
            <div className="flex gap-[10px] mt-4">
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="flex-1 h-[66px] bg-red-500 rounded-[30px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] flex items-center justify-center"
                >
                  <span className="text-sm font-semibold leading-[1.174] text-white">Удалить</span>
                </button>
              )}
              {onBlock && (
                <button
                  onClick={onBlock}
                  className="flex-1 h-[66px] bg-gray-medium rounded-[30px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] flex items-center justify-center"
                >
                  <span className="text-sm font-semibold leading-[1.174] text-white">
                    {editingProduct.status === 'BLOCKED' ? 'Активировать' : 'Заблокировать'}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          className="fixed bg-white shadow-lg rounded-[10px] border border-gray-300 z-[60] min-w-[120px]"
          style={{
            top: `${contextMenu.y}px`,
            left: `${contextMenu.x}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleDeleteImage}
            className="w-full px-4 py-3 text-left text-red-500 hover:bg-gray-light rounded-[10px] transition-colors"
          >
            Удалить
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminProductCard;
