import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { marutiBrochures } from '../data/brochures';

export function BrochureViewerSheet({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_e, info) => {
              if (info.offset.y > 150 || info.velocity.y > 500) {
                onClose();
              }
            }}
            className="fixed bottom-0 left-0 right-0 z-[70] h-[90vh] bg-surface-container rounded-t-[2.5rem] border-t border-white/10 shadow-[0_-20px_40px_rgba(0,0,0,0.5)] flex flex-col"
          >
            {/* Drag Handle */}
            <div className="w-full pt-4 pb-2 flex justify-center cursor-grab active:cursor-grabbing">
              <div className="w-12 h-1.5 rounded-full bg-outline-variant/50"></div>
            </div>

            {/* Header */}
            <div className="px-6 py-4 flex justify-between items-center border-b border-white/5">
              <div>
                <h2 className="font-headline font-bold text-2xl text-on-surface">Digital Brochures</h2>
                <p className="font-label text-xs text-secondary tracking-widest uppercase mt-1">Select to view or share</p>
              </div>
              <button onClick={onClose} className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {marutiBrochures.slice(0, 3).map((b) => (
                <div key={b.id} className="flex gap-4 p-4 rounded-2xl bg-surface-container-high border border-outline-variant/10 hover:bg-surface-container-highest transition-colors cursor-pointer group">
                  <div className="w-32 h-24 rounded-xl overflow-hidden bg-surface-container-highest">
                    <img src={b.image} alt={b.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <h3 className="font-headline font-bold text-lg text-on-surface">{b.name}</h3>
                    <p className="font-label text-sm text-on-surface-variant mb-3">{b.type}</p>
                    <div className="flex gap-2">
                      <button className="flex-1 py-2 rounded-lg bg-primary/10 text-primary font-headline text-xs font-bold uppercase hover:bg-primary/20 transition-colors flex items-center justify-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">visibility</span> View
                      </button>
                      <button className="flex-1 py-2 rounded-lg bg-secondary/10 text-secondary font-headline text-xs font-bold uppercase hover:bg-secondary/20 transition-colors flex items-center justify-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">mail</span> Share
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
