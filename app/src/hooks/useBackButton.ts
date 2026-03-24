import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export function useBackButton(webApp: MaxWebApp | null) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!webApp) return;

    if (location.pathname === '/') {
      webApp.BackButton.hide();
      return;
    }

    webApp.BackButton.show();

    const handler = () => {
      // If at root of history stack, go home instead of navigate(-1)
      if (location.key === 'default') {
        navigate('/', { replace: true });
      } else {
        navigate(-1);
      }
    };

    webApp.BackButton.onClick(handler);

    return () => {
      webApp.BackButton.offClick(handler);
    };
  }, [webApp, location.pathname, location.key, navigate]);
}
