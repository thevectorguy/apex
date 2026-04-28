import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getBootstrap } from '../lib/appApi';
import type { AppBootstrap } from '../lib/appTypes';
import { useAuth } from './AuthContext';

type AppContextValue = {
  bootstrap: AppBootstrap | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { isReady, isAuthenticated, user } = useAuth();
  const [bootstrap, setBootstrap] = useState<AppBootstrap | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!isAuthenticated) {
      setBootstrap(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    void loadBootstrap();
  }, [isAuthenticated, isReady, user?.email, user?.fullName]);

  async function loadBootstrap() {
    setIsLoading(true);
    setError(null);
    try {
      const nextBootstrap = await getBootstrap();
      setBootstrap({
        ...nextBootstrap,
        me: {
          ...nextBootstrap.me,
          id: user?.id || nextBootstrap.me.id,
          firstName: user?.firstName || nextBootstrap.me.firstName,
          fullName: user?.fullName || nextBootstrap.me.fullName,
          role: user?.role || nextBootstrap.me.role,
          showroom: user?.showroom || nextBootstrap.me.showroom,
          avatarUrl: user?.avatarUrl || nextBootstrap.me.avatarUrl,
        },
      });
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Could not load app context.');
    } finally {
      setIsLoading(false);
    }
  }

  const value = useMemo(
    () => ({
      bootstrap,
      isLoading,
      error,
      refresh: loadBootstrap,
    }),
    [bootstrap, error, isLoading],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used inside AppProvider.');
  }
  return context;
}
