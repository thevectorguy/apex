import { useState } from 'react';
import { Screen } from '../types';
import { writeSearchParam } from '../lib/appRouter';

export function PitchPracticeScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [selectedPersona, setSelectedPersona] = useState<'skeptic' | 'tech_enthusiast' | 'budget_buyer'>('skeptic');

  function startSimulation() {
    onNavigate('live_scenario');
    writeSearchParam('vehicle', 'brezza');
    writeSearchParam('persona', selectedPersona);
  }

  return (
    <main className="pt-24 pb-32 px-6 max-w-5xl mx-auto">
      {/* Header */}
      <section className="mb-8">
        <div className="flex justify-between items-end mb-6">
          <div>
            <span className="font-label text-secondary text-xs uppercase tracking-[0.2em] mb-1 block">Training</span>
            <h1 className="font-headline text-5xl font-bold tracking-tight text-on-surface">Pitch Practice</h1>
          </div>
        </div>
        <p className="font-body text-on-surface-variant text-lg">
          Hone your sales pitch with our AI-driven customer simulator. Choose a customer persona to begin.
        </p>
      </section>

      {/* Scenario Selection */}
      <section className="mb-10">
        <h2 className="font-headline text-xl font-semibold text-on-surface mb-4">Customer Persona</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className={`flex items-start gap-4 p-5 rounded-2xl cursor-pointer shadow-[0_14px_34px_rgba(15,23,42,0.08)] ${selectedPersona === 'skeptic' ? 'bg-white/88 border-2 border-primary ring-4 ring-primary/10' : 'bg-white/76 border border-white/80 hover:bg-white/92 transition-colors ring-1 ring-slate-900/5'}`}>
            <input type="radio" name="persona" checked={selectedPersona === 'skeptic'} onChange={() => setSelectedPersona('skeptic')} className="mt-1 w-5 h-5 text-primary bg-surface-container-highest border-outline-variant focus:ring-primary focus:ring-offset-surface" />
            <div>
              <h3 className="font-headline font-bold text-on-surface text-lg">The Skeptic</h3>
              <p className="font-body text-sm text-on-surface-variant mt-1">
                Worried about mileage claims, resale, and whether the higher trim is really worth it.
              </p>
            </div>
          </label>

          <label className={`flex items-start gap-4 p-5 rounded-2xl cursor-pointer shadow-[0_14px_34px_rgba(15,23,42,0.08)] ${selectedPersona === 'tech_enthusiast' ? 'bg-white/88 border-2 border-primary ring-4 ring-primary/10' : 'bg-white/76 border border-white/80 hover:bg-white/92 transition-colors ring-1 ring-slate-900/5'}`}>
            <input type="radio" name="persona" checked={selectedPersona === 'tech_enthusiast'} onChange={() => setSelectedPersona('tech_enthusiast')} className="mt-1 w-5 h-5 text-primary bg-surface-container-highest border-outline-variant focus:ring-primary focus:ring-offset-surface" />
            <div>
              <h3 className="font-headline font-bold text-on-surface text-lg">The Tech Enthusiast</h3>
              <p className="font-body text-sm text-on-surface-variant mt-1">
                Wants a sharp walkthrough of infotainment, connected features, cameras, and convenience tech.
              </p>
            </div>
          </label>

          <label className={`flex items-start gap-4 p-5 rounded-2xl cursor-pointer shadow-[0_14px_34px_rgba(15,23,42,0.08)] ${selectedPersona === 'budget_buyer' ? 'bg-white/88 border-2 border-primary ring-4 ring-primary/10' : 'bg-white/76 border border-white/80 hover:bg-white/92 transition-colors ring-1 ring-slate-900/5'}`}>
            <input type="radio" name="persona" checked={selectedPersona === 'budget_buyer'} onChange={() => setSelectedPersona('budget_buyer')} className="mt-1 w-5 h-5 text-primary bg-surface-container-highest border-outline-variant focus:ring-primary focus:ring-offset-surface" />
            <div>
              <h3 className="font-headline font-bold text-on-surface text-lg">The Budget Buyer</h3>
              <p className="font-body text-sm text-on-surface-variant mt-1">
                Focused on EMI, exchange value, running cost, and which Maruti variant lands best on value.
              </p>
            </div>
          </label>
        </div>
      </section>

      {/* Action */}
      <div className="flex justify-center mt-12">
        <button
          onClick={startSimulation}
          className="relative overflow-hidden group bg-gradient-to-r from-primary to-secondary text-on-primary-fixed px-12 py-5 rounded-full font-headline font-bold text-xl tracking-wide shadow-[0_0_30px_rgba(164,201,255,0.3)] hover:shadow-[0_0_40px_rgba(164,201,255,0.5)] transition-all transform hover:-translate-y-1 active:scale-95 flex items-center gap-3"
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
          <span className="relative z-10 material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
          <span className="relative z-10">START SIMULATION</span>
        </button>
      </div>
    </main>
  );
}
