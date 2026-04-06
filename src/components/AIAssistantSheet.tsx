import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export function AIAssistantSheet({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  // Prevent scrolling on body when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const [query, setQuery] = useState('');

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
            className="fixed bottom-0 left-0 right-0 z-[70] h-[85vh] bg-surface-container rounded-t-[2.5rem] border-t border-white/10 shadow-[0_-20px_40px_rgba(0,0,0,0.5)] flex flex-col"
          >
            {/* Drag Handle */}
            <div className="w-full pt-4 pb-2 flex justify-center cursor-grab active:cursor-grabbing">
              <div className="w-12 h-1.5 rounded-full bg-outline-variant/50"></div>
            </div>

            {/* Header */}
            <div className="px-6 py-4 flex justify-between items-center border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                </div>
                <div>
                  <h2 className="font-headline font-bold text-lg text-on-surface">DILOS Intelligence</h2>
                  <p className="font-label text-xs text-secondary tracking-widest uppercase">Expert System</p>
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col hide-scrollbar">
              <div className="self-start max-w-[85%]">
                <div className="bg-surface-container-high rounded-2xl rounded-tl-sm p-4 border border-outline-variant/10">
                  <p className="font-body text-sm text-on-surface">
                    Hello Arjun. I'm analyzing the <strong>DILOS GT-Carbon</strong> performance data for your upcoming meeting with Mr. Smith. How can I assist you in preparing?
                  </p>
                </div>
                <span className="text-[10px] font-label text-on-surface-variant ml-2 mt-1 block">10:42 AM</span>
              </div>

              {/* Suggested Prompts */}
              <div className="flex gap-2 overflow-x-auto hide-scrollbar pt-2 pb-4">
                <button className="whitespace-nowrap px-4 py-2 rounded-full border border-primary/30 text-primary font-body text-xs hover:bg-primary/10 transition-colors">
                  Top selling points vs standard GT
                </button>
                <button className="whitespace-nowrap px-4 py-2 rounded-full border border-primary/30 text-primary font-body text-xs hover:bg-primary/10 transition-colors">
                  Current model availability
                </button>
              </div>
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/5 bg-surface-container/80 backdrop-blur-md pb-safe">
              <div className="relative flex items-center">
                <button className="absolute left-3 w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors">
                  <span className="material-symbols-outlined">add</span>
                </button>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask anything..."
                  className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-full py-3 pl-12 pr-12 font-body text-sm text-on-surface placeholder:text-outline/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                />
                <button
                  className={`absolute right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all ${query.trim() ? 'bg-primary text-on-primary-fixed' : 'bg-transparent text-outline'}`}
                >
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>arrow_upward</span>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
