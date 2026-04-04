import { useState } from 'react';
import { Screen } from '../types';
import { writeSearchParam } from '../lib/appRouter';

export function PitchPracticeScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [selectedVehicle, setSelectedVehicle] = useState<'elevate' | 'gt-carbon'>('elevate');
  const [selectedPersona, setSelectedPersona] = useState<'skeptic' | 'tech_enthusiast' | 'budget_buyer'>('skeptic');

  function startSimulation() {
    onNavigate('live_scenario');
    writeSearchParam('vehicle', selectedVehicle);
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
          Hone your sales pitch with our AI-driven customer simulator. Select a vehicle and scenario to begin.
        </p>
      </section>

      {/* Vehicle Selection */}
      <section className="mb-10">
        <h2 className="font-headline text-xl font-semibold text-on-surface mb-4">Select Vehicle</h2>
        <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4">
          <button
            type="button"
            onClick={() => setSelectedVehicle('elevate')}
            className={`flex-shrink-0 w-48 p-4 rounded-2xl text-left transition-all ${
              selectedVehicle === 'elevate'
                ? 'bg-surface-container-high border-2 border-primary'
                : 'bg-surface-container border border-outline-variant/10 opacity-70 hover:bg-surface-container-high hover:opacity-100'
            }`}
          >
            <div className="w-full h-24 rounded-xl bg-surface-container-highest mb-3 overflow-hidden">
              <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDhXIdhTuTs5bnCuHvnw0p3tJN0JqMUu2oGchCZJEQBKVKyRYaARHUn50iGNTKYanc-sf8dVJXz-3-eI7SBI-S-x2Tuj2ucWlA4BfPpEPUkJw6V5KSx8KEdIn_p_xAYL_f0Ba7x2QnsIThG_wcWYOEb8rhgBcSZe4apSnxgM7y4o8D7-rL_hvDuu_sMawFSyNxd5pDStq4GiJdqcU3CQmfcPge91c15Cb4LD3DbzfNmRdZsFvM-yertu2SzHFulXvlhCgqESKJCjfY" alt="Elevate" className="w-full h-full object-cover" />
            </div>
            <h3 className="font-headline font-bold text-on-surface">Honda Elevate</h3>
            <p className="font-label text-xs text-secondary mt-1">Focus: EV Features</p>
          </button>

          <button
            type="button"
            onClick={() => setSelectedVehicle('gt-carbon')}
            className={`flex-shrink-0 w-48 p-4 rounded-2xl text-left transition-all ${
              selectedVehicle === 'gt-carbon'
                ? 'bg-surface-container-high border-2 border-primary'
                : 'bg-surface-container border border-outline-variant/10 opacity-70 hover:bg-surface-container-high hover:opacity-100'
            }`}
          >
            <div className="w-full h-24 rounded-xl bg-surface-container-highest mb-3 overflow-hidden">
              <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDZ1s3plcYdQGJnNeQ1aPcdeSfdPe08bpcEvAjF_DUhMMi7mKxjcMatFH0MSkVV2shP9a4zXxjNkUD3fr4eEQSmQndDRPvSDYnKdYImSbkoU-bg4Fadej4b065x3gGjGGtkjzLdDOJPlFtePMWws2hcRZk_brwj_nWCFwnrWVTi_DwPTqBpHHc_RCUkQQqax3UDztPdHSkxLIBGjYOlmNnyTOtFV4L66BAZnRqoRg2K9mMniTB5EBOvXCumJbR2r7RiE1lB0vRsfxc" alt="DILOS GT" className="w-full h-full object-cover" />
            </div>
            <h3 className="font-headline font-bold text-on-surface">DILOS GT-Carbon</h3>
            <p className="font-label text-xs text-on-surface-variant mt-1">Focus: Performance</p>
          </button>
        </div>
      </section>

      {/* Scenario Selection */}
      <section className="mb-10">
        <h2 className="font-headline text-xl font-semibold text-on-surface mb-4">Customer Persona</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className={`flex items-start gap-4 p-5 rounded-2xl cursor-pointer ${selectedPersona === 'skeptic' ? 'bg-surface-container-high border-2 border-primary' : 'bg-surface-container border border-outline-variant/10 hover:bg-surface-container-high transition-colors'}`}>
            <input type="radio" name="persona" checked={selectedPersona === 'skeptic'} onChange={() => setSelectedPersona('skeptic')} className="mt-1 w-5 h-5 text-primary bg-surface-container-highest border-outline-variant focus:ring-primary focus:ring-offset-surface" />
            <div>
              <h3 className="font-headline font-bold text-on-surface text-lg">The Skeptic</h3>
              <p className="font-body text-sm text-on-surface-variant mt-1">
                Concerned about EV range and charging infrastructure. Needs reassurance with facts and figures.
              </p>
            </div>
          </label>

          <label className={`flex items-start gap-4 p-5 rounded-2xl cursor-pointer ${selectedPersona === 'tech_enthusiast' ? 'bg-surface-container-high border-2 border-primary' : 'bg-surface-container border border-outline-variant/10 hover:bg-surface-container-high transition-colors'}`}>
            <input type="radio" name="persona" checked={selectedPersona === 'tech_enthusiast'} onChange={() => setSelectedPersona('tech_enthusiast')} className="mt-1 w-5 h-5 text-primary bg-surface-container-highest border-outline-variant focus:ring-primary focus:ring-offset-surface" />
            <div>
              <h3 className="font-headline font-bold text-on-surface text-lg">The Tech Enthusiast</h3>
              <p className="font-body text-sm text-on-surface-variant mt-1">
                Wants to know about the infotainment system, autonomous features, and app integration.
              </p>
            </div>
          </label>

          <label className={`flex items-start gap-4 p-5 rounded-2xl cursor-pointer ${selectedPersona === 'budget_buyer' ? 'bg-surface-container-high border-2 border-primary' : 'bg-surface-container border border-outline-variant/10 hover:bg-surface-container-high transition-colors'}`}>
            <input type="radio" name="persona" checked={selectedPersona === 'budget_buyer'} onChange={() => setSelectedPersona('budget_buyer')} className="mt-1 w-5 h-5 text-primary bg-surface-container-highest border-outline-variant focus:ring-primary focus:ring-offset-surface" />
            <div>
              <h3 className="font-headline font-bold text-on-surface text-lg">The Budget Buyer</h3>
              <p className="font-body text-sm text-on-surface-variant mt-1">
                Focused on total cost of ownership, financing options, and long-term value.
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
