import { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { type Screen } from '../types';

export function TopAppBar({
  onNavigate,
  onOpenSidebar,
  showMenuButton = true,
}: {
  onNavigate: (screen: Screen) => void;
  onOpenSidebar?: () => void;
  showMenuButton?: boolean;
}) {
  const { bootstrap } = useApp();
  const me = bootstrap?.me;
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const isDarkOS = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const localTheme = localStorage.getItem('theme');
    const shouldBeDark = localTheme === 'dark' || (!localTheme && isDarkOS);
    
    setIsDark(shouldBeDark);
    if (shouldBeDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, []);

  const toggleTheme = () => {
    const nextIsDark = !isDark;
    setIsDark(nextIsDark);
    localStorage.setItem('theme', nextIsDark ? 'dark' : 'light');
    if (nextIsDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  return (
    <header className="fixed top-0 w-full z-50 bg-white/82 dark:bg-neutral-900/40 border-b border-slate-200/70 dark:border-transparent backdrop-blur-2xl flex justify-between items-center px-6 h-16 shadow-[0_10px_30px_rgba(15,23,42,0.06)] dark:shadow-none">
      <div className="flex items-center gap-3">
        {showMenuButton ? (
          <button
            type="button"
            onClick={onOpenSidebar}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 dark:border-white/8 bg-[radial-gradient(circle_at_top,rgba(0,122,255,0.08),rgba(255,255,255,0.02))] dark:bg-[radial-gradient(circle_at_top,rgba(164,201,255,0.12),rgba(255,255,255,0.02))] text-primary dark:text-[#a4c9ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-300 hover:border-black/20 dark:hover:border-[#f4d59b]/20 hover:bg-[radial-gradient(circle_at_top,rgba(194,155,87,0.1),rgba(255,255,255,0.03))] dark:hover:bg-[radial-gradient(circle_at_top,rgba(244,213,155,0.16),rgba(255,255,255,0.03))] hover:text-secondary dark:hover:text-[#f4d59b]"
            aria-label="Open navigation sidebar"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }} data-icon="menu">
              menu
            </span>
          </button>
        ) : null}
        <span className="font-headline text-xl font-bold tracking-tighter text-on-surface dark:text-[#e4e1e9]">DILOS</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleTheme}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 dark:border-white/8 text-on-surface-variant dark:text-white/60 transition-all duration-300 hover:text-primary dark:hover:text-[#a4c9ff]"
          aria-label="Toggle theme"
        >
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            {isDark ? 'light_mode' : 'dark_mode'}
          </span>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('profile')}
          className="h-10 w-10 overflow-hidden rounded-full border-2 border-primary/20 dark:border-[#a4c9ff]/30 flex-shrink-0"
          aria-label="Open profile"
        >
          {me?.avatarUrl ? <img alt="User profile" className="h-full w-full object-cover" src={me.avatarUrl} /> : null}
        </button>
      </div>
    </header>
  );
}
