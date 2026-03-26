export function FloatingActionButton({ onClick }: { onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="fixed bottom-28 right-6 w-14 h-14 bg-secondary text-surface-container-lowest rounded-full shadow-[0_0_20px_rgba(227,194,133,0.5)] flex items-center justify-center z-40 active:scale-90 transition-transform hover:scale-105"
    >
      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
    </button>
  );
}
