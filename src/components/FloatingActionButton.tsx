import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

const SCROLL_DIRECTION_THRESHOLD = 10;
const HIDDEN_OFFSET = 180;

export function FloatingActionButton({ onClick }: { onClick: () => void }) {
  const [isHidden, setIsHidden] = useState(false);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    lastScrollYRef.current = window.scrollY;
    let frameId = 0;

    const handleScroll = () => {
      if (frameId) return;

      frameId = window.requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        const scrollDelta = currentScrollY - lastScrollYRef.current;

        if (currentScrollY <= 24) {
          setIsHidden(false);
        } else if (scrollDelta > SCROLL_DIRECTION_THRESHOLD) {
          setIsHidden(true);
        } else if (scrollDelta < -SCROLL_DIRECTION_THRESHOLD) {
          setIsHidden(false);
        }

        lastScrollYRef.current = currentScrollY;
        frameId = 0;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);

      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={false}
      whileHover={isHidden ? undefined : { scale: 1.05 }}
      whileTap={isHidden ? undefined : { scale: 0.9 }}
      animate={
        isHidden
          ? { y: HIDDEN_OFFSET, opacity: 0, scale: 0.92 }
          : { y: 0, opacity: 1, scale: 1 }
      }
      transition={{ type: 'spring', stiffness: 280, damping: 28, mass: 0.9 }}
      className={`fixed bottom-28 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-surface-container-lowest shadow-[0_0_20px_rgba(227,194,133,0.5)] will-change-transform ${
        isHidden ? 'pointer-events-none' : ''
      }`}
    >
      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
        auto_awesome
      </span>
    </motion.button>
  );
}
