import { useNavigate } from 'react-router-dom';
import StoreAddresses from '../components/StoreAddresses';
import { useAppContext } from '../context/AppContext';

export default function StoreAddressesPage() {
  const navigate = useNavigate();
  const { setSelectedAddress, userInfo, initData, setIsMenuOpen } = useAppContext();

  return (
    <StoreAddresses
      onSelectAddress={(address: string) => {
        setSelectedAddress(address);
        navigate(-1);
      }}
      onMenuClick={() => { setIsMenuOpen(true); }}
      userMode={userInfo?.mode}
      initData={initData}
    />
  );
}
