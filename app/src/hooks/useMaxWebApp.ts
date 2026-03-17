import { useEffect, useState } from 'react';

interface UseMaxWebAppReturn {
  webApp: MaxWebApp | null;
  user: MaxWebApp['initDataUnsafe']['user'] | null;
  isReady: boolean;
}

export const useMaxWebApp = (): UseMaxWebAppReturn => {
  const [webApp, setWebApp] = useState<MaxWebApp | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const app = window.WebApp;

    if (app) {
      app.ready();
      setWebApp(app);
      setIsReady(true);
    }
  }, []);

  return {
    webApp,
    user: webApp?.initDataUnsafe?.user || null,
    isReady,
  };
};

export default useMaxWebApp;
