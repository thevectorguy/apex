import { Screen } from '../types';

export function BottomNavBar({ currentScreen, onNavigate }: { currentScreen: Screen; onNavigate: (s: Screen) => void }) {
  const navItems = [
    { id: 'dashboard', icon: 'home' },
    { id: 'catalog', icon: 'directions_car' },
    { id: 'studio_config', icon: 'view_in_ar' },
    { id: 'communications', icon: 'chat_bubble' },
    { id: 'pitch_practice', icon: 'exercise' },
  ] as const;

  return (
    <nav className="fixed bottom-6 left-4 right-4 flex justify-around items-center px-2 bg-white/82 dark:bg-[#1f1f25]/40 backdrop-blur-2xl rounded-[36pt] z-50 h-16 shadow-[0_14px_34px_rgba(28,25,23,0.12)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.4)] border border-white/70 dark:border-t dark:border-white/5">
      {navItems.map((item) => {
        const isActive = currentScreen === item.id || (currentScreen === 'brochures' && item.id === 'catalog');

        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex items-center justify-center transition-all duration-300 ${
              isActive
                ? 'bg-[#caa24d] text-white dark:text-[#0e0e13] rounded-full w-12 h-12 shadow-[0_8px_18px_rgba(202,162,77,0.35)] dark:shadow-[0_0_15px_rgba(227,194,133,0.4)] scale-110'
                : 'text-[#9ca0a6] dark:text-[#e4e1e9]/50 w-12 h-12 hover:text-[#caa24d] dark:hover:text-[#e3c285] scale-90 active:scale-110'
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
              {item.icon}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
