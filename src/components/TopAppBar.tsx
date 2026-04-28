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

  return (
    <header className="fixed top-0 w-full z-50 bg-neutral-900/40 backdrop-blur-xl flex justify-between items-center px-6 h-16 w-full">
      <div className="flex items-center gap-3">
        {showMenuButton ? (
          <button
            type="button"
            onClick={onOpenSidebar}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/8 bg-[radial-gradient(circle_at_top,rgba(164,201,255,0.12),rgba(255,255,255,0.02))] text-[#a4c9ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-300 hover:border-[#f4d59b]/20 hover:bg-[radial-gradient(circle_at_top,rgba(244,213,155,0.16),rgba(255,255,255,0.03))] hover:text-[#f4d59b]"
            aria-label="Open navigation sidebar"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }} data-icon="menu">
              menu
            </span>
          </button>
        ) : null}
        <span className="font-headline text-xl font-bold tracking-tighter text-[#e4e1e9]">DILOS</span>
      </div>
      <button
        type="button"
        onClick={() => onNavigate('profile')}
        className="h-10 w-10 overflow-hidden rounded-full border-2 border-[#a4c9ff]/30"
        aria-label="Open profile"
      >
        {me?.avatarUrl ? <img alt="User profile" className="h-full w-full object-cover" src={me.avatarUrl} /> : null}
      </button>
    </header>
  );
}
