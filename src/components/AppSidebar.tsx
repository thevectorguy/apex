import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { Screen } from '../types';

const sidebarItems: Array<{ screen: Screen; label: string; icon: string }> = [
  { screen: 'dashboard', label: 'Dashboard', icon: 'home' },
  { screen: 'my_coach', label: 'My Coach', icon: 'support_agent' },
  { screen: 'catalog', label: 'Catalog', icon: 'directions_car' },
  { screen: 'brochures', label: 'Brochures', icon: 'folder_special' },
  { screen: 'communications', label: 'Communications', icon: 'chat_bubble' },
  { screen: 'pitch_practice', label: 'Pitch Practice', icon: 'exercise' },
  { screen: 'studio_config', label: 'Studio Config', icon: 'view_in_ar' },
  { screen: 'profile', label: 'Profile', icon: 'person' },
];

export function AppSidebar({
  currentScreen,
  isOpen,
  onClose,
  onNavigate,
}: {
  currentScreen: Screen;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (screen: Screen) => void;
}) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-[radial-gradient(circle_at_top_left,rgba(164,201,255,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(227,194,133,0.12),transparent_32%),rgba(3,6,12,0.72)] backdrop-blur-md"
            aria-label="Close navigation sidebar"
          />
          <motion.aside
            initial={{ x: '-100%', opacity: 0.8, scale: 0.98 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: '-100%', opacity: 0.86, scale: 0.985 }}
            transition={{ type: 'spring', stiffness: 310, damping: 32, mass: 0.9 }}
            className="fixed inset-y-0 left-0 z-[70] flex w-[min(84vw,21rem)] flex-col overflow-hidden border-r border-[#f4d59b]/12 bg-[linear-gradient(180deg,rgba(13,18,28,0.98),rgba(8,12,19,0.97)),radial-gradient(circle_at_top_left,rgba(164,201,255,0.14),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(227,194,133,0.16),transparent_36%)] px-5 pb-6 pt-6 shadow-[24px_0_60px_rgba(0,0,0,0.55)]"
          >
            <div className="pointer-events-none absolute inset-0 carbon-texture opacity-[0.06]"></div>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_56%)]"></div>

            <div className="relative mb-8 flex items-center justify-between">
              <div>
                <p className="font-label text-[10px] uppercase tracking-[0.26em] text-[#a4c9ff]/78">Navigation</p>
                <h2 className="mt-2 font-headline text-[2rem] font-bold tracking-[-0.04em] text-[#f6f1e7]">DILOS</h2>
                <p className="mt-2 max-w-[18ch] text-sm leading-5 text-white/54">Move through the core workspace without breaking flow.</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/70 transition-all hover:border-[#f4d59b]/25 hover:bg-white/[0.06] hover:text-[#f4d59b]"
                aria-label="Close navigation sidebar"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <motion.nav
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={{
                hidden: {},
                visible: {
                  transition: {
                    staggerChildren: 0.045,
                    delayChildren: 0.08,
                  },
                },
              }}
              className="relative flex-1 space-y-2"
            >
              {sidebarItems.map((item) => {
                const isActive = isSidebarItemActive(currentScreen, item.screen);

                return (
                  <motion.button
                    key={item.screen}
                    type="button"
                    variants={{
                      hidden: { opacity: 0, x: -18 },
                      visible: { opacity: 1, x: 0 },
                    }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    onClick={() => {
                      onNavigate(item.screen);
                      onClose();
                    }}
                    className={`group relative flex w-full items-center gap-3 overflow-hidden rounded-[20px] border px-4 py-3 text-left transition-all duration-300 ${
                      isActive
                        ? 'border-[#f4d59b]/20 bg-[linear-gradient(135deg,rgba(255,222,163,0.96),rgba(227,194,133,0.92))] text-[#1c1509] shadow-[0_14px_34px_rgba(227,194,133,0.22)]'
                        : 'border-white/6 bg-white/[0.025] text-white/78 hover:border-[#a4c9ff]/14 hover:bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] hover:text-white'
                    }`}
                  >
                    <div
                      className={`pointer-events-none absolute inset-0 transition-opacity duration-300 ${
                        isActive
                          ? 'bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_42%)] opacity-100'
                          : 'bg-[radial-gradient(circle_at_top_right,rgba(164,201,255,0.16),transparent_42%)] opacity-0 group-hover:opacity-100'
                      }`}
                    />
                    <span
                      className={`relative material-symbols-outlined text-[20px] transition-transform duration-300 ${
                        isActive ? '' : 'group-hover:translate-x-0.5'
                      }`}
                      style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      {item.icon}
                    </span>
                    <span className="relative font-body text-sm font-medium">{item.label}</span>
                    <span
                      className={`relative ml-auto material-symbols-outlined text-[18px] transition-all duration-300 ${
                        isActive ? 'translate-x-0 opacity-100' : 'translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'
                      }`}
                    >
                      arrow_forward
                    </span>
                  </motion.button>
                );
              })}
            </motion.nav>

            <div className="relative mt-6 rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <p className="font-label text-[10px] uppercase tracking-[0.22em] text-[#f4d59b]/80">Workspace</p>
              <p className="mt-2 text-sm leading-5 text-white/60">Premium navigation with fast access to the main surfaces of the app.</p>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function isSidebarItemActive(currentScreen: Screen, itemScreen: Screen) {
  if (itemScreen === 'my_coach') {
    return currentScreen.startsWith('my_coach');
  }

  return currentScreen === itemScreen;
}
