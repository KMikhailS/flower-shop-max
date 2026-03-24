import { useNavigate } from 'react-router-dom';
import DeliveryInfo from '../components/DeliveryInfo';
import { useAppContext } from '../context/AppContext';

export default function DeliveryInfoPage() {
  const navigate = useNavigate();
  const { initData, userInfo } = useAppContext();

  return (
    <DeliveryInfo
      onClose={() => navigate(-1)}
      initData={initData}
      userMode={userInfo?.mode}
    />
  );
}
