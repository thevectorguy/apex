import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Screen } from '../types';

type SessionState = 'idle' | 'listening' | 'processing' | 'speaking';

export function LiveScenarioScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [session, setSession] = useState<SessionState>('idle');
  const [transcript, setTranscript] = useState('');

  // Fake interaction flow for the prototype
  useEffect(() => {
    if (session === 'listening') {
      setTranscript("So, about the Touring edition...");
      const t = setTimeout(() => setSession('processing'), 2000);
      return () => clearTimeout(t);
    } else if (session === 'processing') {
      const t = setTimeout(() => setSession('speaking'), 1500);
      return () => clearTimeout(t);
    } else if (session === 'speaking') {
      setTranscript("I'm just not sure about the range. I drive a lot for work, sometimes 200 kilometers a day. What happens if I get stuck in traffic with the AC on?");
    }
  }, [session]);

  const handleMicClick = () => {
    if (session === 'idle' || session === 'speaking') {
      setSession('listening');
    } else if (session === 'listening') {
      setSession('processing');
    }
  };

  return (
    <main className="h-[100dvh] w-full bg-[#0a0a0a] flex flex-col relative overflow-hidden">
      {/* Dynamic Background Aura */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40 mix-blend-screen">
        <motion.div 
          animate={{
            scale: session === 'speaking' ? [1, 1.2, 1] : 1,
            opacity: session === 'listening' ? 0.3 : 0.1
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-primary rounded-full blur-[120px]"
        />
        <motion.div 
          animate={{
            scale: session === 'processing' ? [1, 1.5, 1] : 1,
            opacity: session === 'processing' ? 0.2 : 0.1
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-secondary rounded-full blur-[100px]"
        />
      </div>

      {/* Header */}
      <header className="relative z-10 pt-14 pb-4 px-6 flex justify-between items-start">
        <div className="flex flex-col gap-4">
          <button 
            onClick={() => onNavigate('pitch_practice')}
            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          >
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-error/20 border border-error/30 text-error font-label text-[10px] font-bold tracking-[0.2em] uppercase">
            <motion.div 
              animate={{ opacity: [1, 0.3, 1] }} 
              transition={{ duration: 2, repeat: Infinity }} 
              className="w-2 h-2 rounded-full bg-error drop-shadow-[0_0_8px_rgba(255,0,0,0.8)]"
            />
            Live Session
          </div>
          <div className="text-right">
            <h1 className="font-headline font-bold text-lg text-white drop-shadow-md">The Skeptic</h1>
            <p className="font-label text-xs text-secondary tracking-widest uppercase mt-0.5">Honda Elevate</p>
          </div>
        </div>
      </header>

      {/* AI Avatar / Siri Orb Area */}
      <section className="flex-1 relative z-10 flex flex-col items-center justify-center px-6 py-2 min-h-0 overflow-y-auto hide-scrollbar">
        <div className="relative w-40 h-40 md:w-56 md:h-56 mb-6 md:mb-12 flex items-center justify-center shrink-0">
          
          {/* Reactive Rings based on State */}
          <AnimatePresence>
            {session === 'speaking' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: [0.6, 0.2, 0.6], scale: [1, 1.3, 1] }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-[-15px] md:inset-[-20px] rounded-full border-2 border-primary/50 mix-blend-screen"
              />
            )}
            {session === 'listening' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: [0.8, 0], scale: [1, 1.8] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                className="absolute inset-0 rounded-full bg-primary/20"
              />
            )}
            {session === 'processing' && (
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute inset-[-8px] md:inset-[-10px] rounded-full border-[3px] border-t-primary border-r-secondary border-b-transparent border-l-transparent"
              />
            )}
          </AnimatePresence>

          {/* Central Avatar Orb */}
          <motion.div 
            animate={{ 
              scale: session === 'speaking' ? [1, 1.05, 1] : 1,
              boxShadow: session === 'speaking' 
                ? '0 0 40px rgba(164,201,255,0.4), inset 0 0 20px rgba(164,201,255,0.4)' 
                : '0 10px 30px rgba(0,0,0,0.8), inset 0 2px 4px rgba(255,255,255,0.1)'
            }}
            transition={{ duration: session === 'speaking' ? 0.3 : 0.8, repeat: Infinity, repeatType: "reverse" }}
            className="absolute inset-3 md:inset-4 rounded-full bg-gradient-to-br from-surface-container to-black border border-white/10 overflow-hidden flex items-center justify-center z-10"
          >
             <img 
               src="https://i.pravatar.cc/300?img=68" 
               alt="AI Profile" 
               className="w-full h-full object-cover opacity-80 mix-blend-luminosity brightness-110 saturate-50" 
             />
             <div className="absolute inset-0 bg-gradient-to-t from-primary/30 to-transparent mix-blend-overlay"></div>
          </motion.div>
        </div>
        
        {/* Dynamic Transcription Subtitles */}
        <div className="text-center max-w-md min-h-[6rem] flex flex-col items-center justify-center shrink-0">
          <AnimatePresence mode="wait">
            {session === 'idle' && (
              <motion.p 
                key="idle"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="font-headline text-xl md:text-2xl font-semibold text-white/40"
              >
                Tap the mic to start the simulation.
              </motion.p>
            )}
            {session === 'listening' && (
              <motion.div key="listening" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-2 md:gap-3">
                <div className="flex gap-1">
                  {[0,1,2].map(i => (
                    <motion.div key={i} animate={{ y: [0, -6, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} className="w-1.5 h-1.5 rounded-full bg-primary" />
                  ))}
                </div>
                <p className="font-headline text-base md:text-lg font-medium text-white/50">{transcript || "Listening..."}</p>
              </motion.div>
            )}
            {session === 'speaking' && (
              <motion.div key="speaking" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }}>
                <h2 className="font-headline text-xl md:text-2xl font-bold text-white leading-snug drop-shadow-md">"{transcript}"</h2>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Controls Area */}
      <section className="relative z-20 px-6 py-6 pb-safe-offset-4 md:p-8 md:pb-12 bg-gradient-to-t from-black via-black/80 to-transparent shrink-0">
        <div className="max-w-xl mx-auto flex flex-col items-center gap-4 md:gap-8">
          
          {/* Smart Coach Feedback */}
          <div className="h-12 flex items-end justify-center">
            <AnimatePresence>
              {session === 'speaking' && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                  className="px-4 py-2 md:px-6 md:py-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 flex items-center gap-2 md:gap-3 shadow-2xl"
                >
                  <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[14px] md:text-[16px] text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
                  </div>
                  <span className="font-body text-xs md:text-sm font-medium text-white shadow-sm line-clamp-2 leading-tight">Focus on the regenerative braking feature.</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Premium Mic Button */}
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={handleMicClick}
            className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl border border-white/10 shrink-0
              ${session === 'listening' 
                ? 'bg-error text-white shadow-[0_0_30px_rgba(255,50,50,0.5)]' 
                : session === 'speaking'
                  ? 'bg-surface-container-high text-white/50 opacity-50'
                  : 'bg-primary text-on-primary-fixed hover:bg-primary/90'
              }
            `}
          >
            <span className="material-symbols-outlined text-[28px] md:text-[32px]">{session === 'listening' ? 'stop' : 'mic'}</span>
          </motion.button>
        </div>
      </section>
    </main>
  );
}
