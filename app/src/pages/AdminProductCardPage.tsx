import { useParams, useNavigate } from 'react-router-dom';
import AdminProductCard from '../components/AdminProductCard';
import { useAppContext } from '../context/AppContext';
import {
  createGoodCard, addGoodImages, updateGoodCard,
  deleteGood, blockGood, activateGood,
} from '../api/client';

export default function AdminProductCardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { products, loadProducts, initData } = useAppContext();

  const editingProduct = id ? products.find(p => p.id === Number(id)) : undefined;

  const handleSave = async (data: {
    id?: number;
    name: string;
    category: string;
    price: number;
    non_discount_price?: number;
    description: string;
    imageFiles: File[];
    sort_order?: number;
  }) => {
    if (!initData) { alert('Ошибка: приложение недоступно'); return; }

    try {
      if (data.id) {
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
          initData
        );
        if (data.imageFiles.length > 0) {
          await addGoodImages(data.id, data.imageFiles, initData);
        }
        navigate(-1);
        alert('Товар успешно обновлен!');
      } else {
        const createdGood = await createGoodCard(
          {
            name: data.name,
            category: data.category,
            price: data.price,
            non_discount_price: data.non_discount_price,
            description: data.description,
            sort_order: data.sort_order,
          },
          initData
        );
        if (data.imageFiles.length > 0) {
          await addGoodImages(createdGood.id, data.imageFiles, initData);
        }
        navigate(-1);
        alert('Товар успешно добавлен!');
      }
      await loadProducts();
    } catch (error) {
      console.error('Failed to save good card:', error);
      alert('Ошибка при сохранении товара. Проверьте права доступа.');
    }
  };

  const handleDelete = async () => {
    if (!initData || !editingProduct) { window.alert('Ошибка'); return; }
    const confirmed = window.confirm(`Удалить товар "${editingProduct.title}"?`);
    if (!confirmed) return;
    try {
      await deleteGood(editingProduct.id, initData);
      window.alert('Товар успешно удалён');
      navigate(-1);
      loadProducts();
    } catch (error) {
      console.error('Failed to delete good:', error);
      window.alert('Ошибка при удалении товара');
    }
  };

  const handleToggleBlock = async () => {
    if (!initData || !editingProduct) { window.alert('Ошибка'); return; }
    try {
      if (editingProduct.status === 'BLOCKED') {
        await activateGood(editingProduct.id, initData);
        window.alert('Товар успешно активирован');
      } else {
        await blockGood(editingProduct.id, initData);
        window.alert('Товар успешно заблокирован');
      }
      navigate(-1);
      await loadProducts();
    } catch (error) {
      console.error('Failed to toggle block status:', error);
      alert('Ошибка при изменении статуса товара');
    }
  };

  return (
    <AdminProductCard
      onClose={() => navigate(-1)}
      onSave={handleSave}
      editingProduct={editingProduct}
      onDelete={editingProduct ? handleDelete : undefined}
      onBlock={editingProduct ? handleToggleBlock : undefined}
      initData={initData}
    />
  );
}
