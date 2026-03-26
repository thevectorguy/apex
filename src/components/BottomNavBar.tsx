type Screen = 'dashboard' | 'catalog' | 'communications' | 'pitch_practice' | 'live_scenario' | 'studio_config';

export function BottomNavBar({ currentScreen, onNavigate }: { currentScreen: Screen, onNavigate: (s: Screen) => void }) {
  const navItems = [
    { id: 'dashboard', icon: 'home' },
    { id: 'catalog', icon: 'directions_car' },
    { id: 'studio_config', icon: 'view_in_ar' },
    { id: 'communications', icon: 'chat_bubble' },
    { id: 'pitch_practice', icon: 'person' },
  ] as const;

  return (
    <nav className="fixed bottom-6 left-4 right-4 flex justify-around items-center px-2 bg-surface-container/40 backdrop-blur-2xl rounded-[36pt] z-50 h-16 shadow-[0_20px_40px_rgba(0,0,0,0.4)] border-t border-white/5">
      {navItems.map((item) => {
        const isActive = currentScreen === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex items-center justify-center transition-all duration-300 ${
              isActive 
                ? 'bg-secondary text-surface rounded-full w-12 h-12 shadow-[0_0_15px_rgba(227,194,133,0.4)] scale-110' 
                : 'text-on-surface/50 w-12 h-12 hover:text-secondary scale-90 active:scale-110'
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
