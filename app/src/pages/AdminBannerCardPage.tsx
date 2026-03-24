import { useParams, useNavigate, Navigate } from 'react-router-dom';
import AdminPromoBannerCard from '../components/AdminPromoBannerCard';
import { useAppContext } from '../context/AppContext';
import {
  deletePromoBanner, blockPromoBanner, activatePromoBanner,
  updatePromoBannerLink,
} from '../api/client';

export default function AdminBannerCardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { promoBanners, loadPromoBanners, initData } = useAppContext();

  const banner = promoBanners.find(b => b.id === Number(id));

  if (!banner) {
    return <Navigate to="/" replace />;
  }

  const handleDelete = async () => {
    if (!initData) { window.alert('Ошибка'); return; }
    const confirmed = window.confirm('Удалить промо-баннер?');
    if (!confirmed) return;
    try {
      await deletePromoBanner(banner.id, initData);
      window.alert('Баннер успешно удалён');
      navigate(-1);
      loadPromoBanners();
    } catch (error) {
      console.error('Failed to delete banner:', error);
      window.alert(`Ошибка при удалении баннера:\n${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleToggleBlock = async () => {
    if (!initData) { alert('Ошибка'); return; }
    try {
      if (banner.status === 'BLOCKED') {
        await activatePromoBanner(banner.id, initData);
        alert('Баннер успешно активирован');
      } else {
        await blockPromoBanner(banner.id, initData);
        alert('Баннер успешно заблокирован');
      }
      navigate(-1);
      await loadPromoBanners();
    } catch (error) {
      console.error('Failed to toggle block status:', error);
      alert('Ошибка при изменении статуса баннера');
    }
  };

  const handleSave = async (link: number | null) => {
    if (!initData) { alert('Ошибка'); return; }
    try {
      await updatePromoBannerLink(banner.id, link, initData);
      navigate(-1);
      await loadPromoBanners();
      alert('Баннер успешно сохранён');
    } catch (error) {
      console.error('Failed to save banner:', error);
      alert('Ошибка при сохранении баннера');
    }
  };

  return (
    <AdminPromoBannerCard
      banner={banner}
      onClose={() => navigate(-1)}
      onDelete={handleDelete}
      onBlock={handleToggleBlock}
      onSave={handleSave}
    />
  );
}
