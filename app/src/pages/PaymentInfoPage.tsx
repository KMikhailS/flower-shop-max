import { useNavigate } from 'react-router-dom';
import PaymentInfo from '../components/PaymentInfo';
import { useAppContext } from '../context/AppContext';

export default function PaymentInfoPage() {
  const navigate = useNavigate();
  const { initData, userInfo } = useAppContext();

  return (
    <PaymentInfo
      onClose={() => navigate(-1)}
      initData={initData}
      userMode={userInfo?.mode}
    />
  );
}
