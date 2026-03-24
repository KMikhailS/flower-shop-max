import { useNavigate, useOutletContext } from 'react-router-dom';
import Settings from '../components/Settings';
import { useAppContext } from '../context/AppContext';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { userInfo, initData, setIsMenuOpen } = useAppContext();
  const { handleSettingsModeChange } = useOutletContext<{ handleSettingsModeChange: () => Promise<void> }>();

  return (
    <Settings
      onClose={() => navigate(-1)}
      onMenuClick={() => { setIsMenuOpen(true); }}
      userMode={userInfo?.mode}
      initData={initData}
      onModeChange={handleSettingsModeChange}
    />
  );
}
