import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AuthSession, AuthUser, beginLogin, initializeAuth, logout } from '../lib/auth';

type AuthContextValue = {
  isReady: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;
  accessToken: string | null;
  signIn: () => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        const nextSession = await initializeAuth();
        if (!isMounted) {
          return;
        }

        if (nextSession) {
          setSession(nextSession);
          setError(null);
          setIsReady(true);
          return;
        }

        await beginLogin();
      } catch (issue) {
        if (!isMounted) {
          return;
        }

        setError(issue instanceof Error ? issue.message : 'Sign-in could not be started.');
        setIsReady(true);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!isReady || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(164,201,255,0.16),transparent_34%),linear-gradient(180deg,#0b0f16,#111826)] px-6 text-white">
        <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-white/[0.04] p-8 text-center shadow-[0_28px_80px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
          <div className="mx-auto mb-5 h-12 w-12 rounded-full border border-white/12 bg-white/[0.06]">
            <div className="h-full w-full animate-spin rounded-full border-2 border-white/20 border-t-[#a4c9ff]" />
          </div>
          <h1 className="font-headline text-2xl font-semibold tracking-tight">Securing your workspace</h1>
          <p className="mt-3 text-sm leading-6 text-white/66">
            {error || 'Redirecting through Keycloak so your DILOS session can reuse the shared realm.'}
          </p>
          {error ? (
            <button
              type="button"
              onClick={() => {
                void beginLogin();
              }}
              className="mt-6 rounded-full border border-[#a4c9ff]/35 bg-[#a4c9ff]/12 px-5 py-2.5 font-label text-xs font-semibold uppercase tracking-[0.18em] text-[#d4e3ff]"
            >
              Retry sign-in
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        isReady,
        isAuthenticated: Boolean(session),
        user: session.user,
        accessToken: session.tokens.accessToken,
        signIn: beginLogin,
        signOut: logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }
  return context;
}
