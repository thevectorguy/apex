import { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { motion } from 'motion/react';
import { Screen } from '../types';
import { CarModel } from '../components/CarModel';

export function StudioConfigScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [paintColor, setPaintColor] = useState('#C0C0C0');
  const [sheetState, setSheetState] = useState<'collapsed' | 'expanded'>('expanded');

  const colors = [
    { name: 'Lunar Silver Metallic', hex: '#C0C0C0' },
    { name: 'Phantom Black', hex: '#1A1A1A' },
    { name: 'Crimson Pearl', hex: '#8B0000' },
    { name: 'Abyss Blue', hex: '#000080' },
    { name: 'Dune Beige', hex: '#F5F5DC' },
  ];

  return (
    <main className="h-[100dvh] w-full bg-[#0a0a0a] flex flex-col relative overflow-hidden">
      {/* Native iOS Top Nav */}
      <header className="absolute top-0 left-0 right-0 z-30 pt-14 pb-4 px-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
        <button 
          onClick={() => onNavigate('catalog')}
          className="flex items-center text-primary font-body text-[17px] active:opacity-50 transition-opacity"
        >
          <span className="material-symbols-outlined text-[28px] -ml-2 leading-none">chevron_left</span>
          <span>Catalog</span>
        </button>
        <div className="flex gap-2">
          <button className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white active:bg-white/20 transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-[18px]">ios_share</span>
          </button>
          <button className="px-4 py-1.5 rounded-full bg-primary text-on-primary-fixed font-semibold text-sm active:scale-95 transition-transform cursor-pointer">
            Save
          </button>
        </div>
      </header>

      {/* 3D Viewport Title */}
      <div className="absolute top-28 left-0 right-0 z-20 pointer-events-none flex flex-col items-center text-center">
        <h1 className="font-headline text-4xl font-extrabold tracking-tight text-white drop-shadow-md">Elevate</h1>
        <p className="font-label text-xs text-white/60 tracking-[0.2em] uppercase mt-1">Touring Edition</p>
      </div>

      {/* 3D Viewport Area */}
      <section className="absolute inset-0 z-10 w-full h-full cursor-grab active:cursor-grabbing" onClick={() => setSheetState('collapsed')}>
        <Canvas camera={{ position: [0, 2, 8], fov: 45 }}>
          <ambientLight intensity={0.5} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} castShadow />
          <Suspense fallback={null}>
            <CarModel color={paintColor} />
          </Suspense>
        </Canvas>
        
        {/* Helper Hint */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-30 mix-blend-overlay">
           <span className="material-symbols-outlined text-6xl">360</span>
        </div>
      </section>

      {/* Collapsible iOS Bottom Sheet */}
      <motion.section 
        className="absolute bottom-0 left-0 right-0 z-40 bg-surface-container-low/80 backdrop-blur-3xl border-t border-white/10 rounded-t-[2.5rem] flex flex-col pt-3"
        initial={false}
        animate={sheetState === 'expanded' ? { y: 0 } : { y: '65%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={(e, info) => {
          if (info.offset.y > 50) setSheetState('collapsed');
          else if (info.offset.y < -50) setSheetState('expanded');
        }}
      >
        {/* Handle */}
        <div 
          className="w-full flex justify-center pb-4 cursor-grab active:cursor-grabbing"
          onClick={() => setSheetState(sheetState === 'expanded' ? 'collapsed' : 'expanded')}
        >
          <div className="w-12 h-1.5 bg-white/20 rounded-full"></div>
        </div>
        
        <div className="px-6 pb-12 w-full max-w-2xl mx-auto space-y-8">
          {/* Paint Selection */}
          <div>
            <div className="flex justify-between items-end mb-4">
              <h3 className="font-headline font-semibold text-lg text-white">Exterior Paint</h3>
              <span className="font-body text-sm text-white/60">{colors.find(c => c.hex === paintColor)?.name}</span>
            </div>
            <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2 px-1">
              {colors.map((color) => (
                <button 
                  key={color.hex}
                  onClick={(e) => { e.stopPropagation(); setPaintColor(color.hex); setSheetState('expanded'); }}
                  className={`w-14 h-14 rounded-full border-2 transition-all shadow-inner flex-shrink-0 cursor-pointer ${paintColor === color.hex ? 'border-primary ring-4 ring-primary/20 scale-110' : 'border-transparent hover:border-white/30 hover:scale-105'}`}
                  style={{ backgroundColor: color.hex }}
                />
              ))}
            </div>
          </div>

          {/* Wheels Selection */}
          <div>
            <h3 className="font-headline font-semibold text-lg text-white mb-4">Wheels</h3>
            <div className="grid grid-cols-2 gap-4">
              <button className="p-4 rounded-[1rem] border-2 border-primary bg-primary/5 flex flex-col items-start cursor-pointer hover:bg-primary/10 transition-colors">
                <span className="font-headline font-bold text-white">18" Aero Alloys</span>
                <span className="font-label text-xs text-primary mt-1">Included</span>
              </button>
              <button className="p-4 rounded-[1rem] border-2 border-transparent bg-white/5 flex flex-col items-start cursor-pointer hover:bg-white/10 transition-colors">
                <span className="font-headline font-bold text-white">19" Sport Black</span>
                <span className="font-label text-xs text-white/50 mt-1">+ ₹45,000</span>
              </button>
            </div>
          </div>

          {/* Pricing Footer Info inside Sheet */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <div>
              <p className="font-label text-xs tracking-widest uppercase text-white/50 mb-1">Vehicle Total</p>
              <p className="font-headline text-2xl font-bold text-white">₹14,25,000</p>
            </div>
            <button className="px-8 py-3 rounded-xl bg-primary/10 text-primary font-headline font-bold text-sm hover:bg-primary/20 transition-colors cursor-pointer">
              Finance
            </button>
          </div>
        </div>
      </motion.section>
    </main>
  );
}
