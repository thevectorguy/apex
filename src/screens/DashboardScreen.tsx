import { useState } from 'react';
import { Screen } from '../types';
import { BrochureViewerSheet } from '../components/BrochureViewerSheet';

export function DashboardScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [isBrochureOpen, setIsBrochureOpen] = useState(false);

  return (
    <>
      <main className="pt-24 px-6 pb-32 space-y-8 max-w-5xl mx-auto">
        {/* Hero Greeting */}
        <section>
          <h1 className="font-headline text-4xl font-bold tracking-tight text-on-surface">Good morning, Arjun.</h1>
          <p className="font-label text-secondary text-sm tracking-widest uppercase mt-1">OCTOBER 24 • ACTIVE SHIFT: 08:30 - 17:00</p>
        </section>

        {/* Today's Target Card */}
        <section className="relative overflow-hidden rounded-[20pt] bg-gradient-to-br from-secondary via-secondary-container to-surface-container shadow-2xl p-6 flex items-center justify-between border border-white/5">
          <div className="absolute inset-0 carbon-texture opacity-10"></div>
          <div className="relative z-10">
            <span className="font-label text-xs font-bold uppercase tracking-[0.2em] text-on-secondary-fixed">Sales Performance</span>
            <div className="mt-2">
              <span className="font-headline text-5xl font-extrabold text-on-secondary-fixed">3 Units</span>
              <p className="text-on-secondary-fixed/70 text-sm font-medium mt-1">2 remaining for daily goal</p>
            </div>
          </div>
          <div className="relative z-10 flex items-center justify-center">
            <svg className="w-24 h-24 transform -rotate-90">
              <circle className="text-on-secondary-fixed/10" cx="48" cy="48" fill="transparent" r="40" stroke="currentColor" strokeWidth="8"></circle>
              <circle className="text-on-secondary-fixed" cx="48" cy="48" fill="transparent" r="40" stroke="currentColor" strokeDasharray="251.2" strokeDashoffset="100.48" strokeWidth="8"></circle>
            </svg>
            <span className="absolute font-headline font-bold text-on-secondary-fixed">60%</span>
          </div>
        </section>

        {/* Quick Actions Grid */}
        <section className="grid grid-cols-2 gap-4">
          <button onClick={() => onNavigate('catalog')} className="bg-surface-container/40 backdrop-blur-md rounded-[20pt] p-4 flex flex-col items-center justify-center gap-2 border border-outline-variant/10 hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-primary text-3xl">menu_book</span>
            <span className="font-label text-xs font-semibold tracking-wide uppercase">Open Catalog</span>
          </button>
          <button onClick={() => onNavigate('pitch_practice')} className="bg-surface-container/40 backdrop-blur-md rounded-[20pt] p-4 flex flex-col items-center justify-center gap-2 border border-outline-variant/10 hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-primary text-3xl">exercise</span>
            <span className="font-label text-xs font-semibold tracking-wide uppercase">Start Practice</span>
          </button>
          <button onClick={() => setIsBrochureOpen(true)} className="bg-surface-container/40 backdrop-blur-md rounded-[20pt] p-4 flex flex-col items-center justify-center gap-2 border border-outline-variant/10 hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-primary text-3xl">folder_special</span>
            <span className="font-label text-xs font-semibold tracking-wide uppercase">View Brochures</span>
          </button>
          <button onClick={() => onNavigate('communications')} className="bg-surface-container/40 backdrop-blur-md rounded-[20pt] p-4 flex flex-col items-center justify-center gap-2 border border-outline-variant/10 hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-primary text-3xl">hub</span>
            <span className="font-label text-xs font-semibold tracking-wide uppercase">Team Comms</span>
          </button>
        </section>

      {/* Live Announcements */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-headline text-lg font-bold tracking-tight text-on-surface">Announcements</h2>
          <span className="text-primary text-xs font-bold uppercase tracking-wider cursor-pointer">View All</span>
        </div>
        <div className="flex overflow-x-auto hide-scrollbar gap-4 -mx-6 px-6">
          <div className="flex-none w-72 h-44 relative rounded-[20pt] overflow-hidden">
            <img 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCOhnHrbg8iTmDnj4rvhacGPjZ2iPEIm5TKoCgdKtjvQamsK3WrLItoUULBZQADFBX_558VLM-4Lla0MJzC3CkA6jHeNnxFpa2gzJjtIhsfM9zFa-HiG5axVU2y77vTAWHv1qfiyeY9YvWt3QvjLmYXnbWn0u_rnA5On2hAvi_RJ43OCwTiUJxf9KXu20Uvx_nZ5PhhB9TRza8Ae9jWeouooBzfxLBSGAsV-wp8OvlUk2YdcIYdA1PgWtBkBYesk0kM5hklheUIurM" 
              alt="Announcements" 
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-transparent to-transparent"></div>
            <span className="absolute top-4 left-4 bg-error text-on-error px-2 py-1 rounded text-[10px] font-bold">NEW</span>
            <div className="absolute bottom-4 left-4 right-4">
              <h3 className="font-headline font-bold text-white leading-tight">Q4 Inventory Update: Limited Editions Arriving</h3>
            </div>
          </div>
          <div className="flex-none w-72 h-44 relative rounded-[20pt] overflow-hidden">
            <img 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuB79Kt4uw0PXlZwcALJOFc9IpZJA10cif5ohmTZKlrpoXzvWGS_5--gT1x0DXbgXwvjijdJsEO7HJGd8zs0sKUUMLPxC_CWtiCxveVZqzFenTWvk5XRhb0_rGfXHZp_IEtRyo6QDov1R0L9_was8gVOvAg_99wpjOJjSbn-jcdPoJcMAV734fhCPSWO_PYFd7SxPRI_yDRofCX8Qcl-H2jZQp7b2b6Ir5YtB1RrMFBl3VUjvr4rIHDRX4GhmT4Wfi3-4_aXO7bLcK4" 
              alt="Announcements" 
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-transparent to-transparent"></div>
            <div className="absolute bottom-4 left-4 right-4">
              <h3 className="font-headline font-bold text-white leading-tight">EV Performance Training Module Now Live</h3>
            </div>
          </div>
        </div>
      </section>

      {/* Assigned Inventory */}
      <section className="space-y-4">
        <h2 className="font-headline text-lg font-bold tracking-tight text-on-surface">Assigned Inventory</h2>
        <div className="flex overflow-x-auto hide-scrollbar gap-4 -mx-6 px-6">
          <div className="flex-none w-64 bg-surface-container rounded-[20pt] p-4 space-y-3 cursor-pointer hover:bg-surface-container-high transition-colors" onClick={() => onNavigate('catalog')}>
            <div className="h-32 rounded-xl overflow-hidden">
              <img 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAQuubsx10_Tc8Dsha7IAyxkOLkan5kCzi8lOroMtoKW5xYfo_r4AuNlrK6zB_BdNRxVwki8wr1Zk7-_tDY5A_CkXzWtNSml-C8Td_rZlVZ7iojCIE5YmaC90ZQuHhF78nhUiQNZAZpXUB7CK1pcXaudx32lpQWD-faqMQlTGDHVKUE7KD66jGNnx3AUuHj3CyGQS1CTt-4oV-1p6rAdCfGpTVu2qZMpNNBHArcv2xeKIYHJExDfHKUzWAXsNqHylVWBAfM_TqDcS0" 
                alt="Car" 
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h4 className="font-headline font-bold text-on-surface">GT Speedster X</h4>
              <div className="flex gap-2 mt-1">
                <span className="font-label text-[10px] bg-surface-container-highest px-2 py-0.5 rounded text-primary uppercase">V12 Hybrid</span>
                <span className="font-label text-[10px] bg-surface-container-highest px-2 py-0.5 rounded text-primary uppercase">In Stock</span>
              </div>
            </div>
          </div>
          <div className="flex-none w-64 bg-surface-container rounded-[20pt] p-4 space-y-3 cursor-pointer hover:bg-surface-container-high transition-colors" onClick={() => onNavigate('catalog')}>
            <div className="h-32 rounded-xl overflow-hidden">
              <img 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCMfKypZNoBEJ5ofBH6RuPdTRqXNlSq2bPwr_Dbw5YyFOPtaZ-rXaPsuDVgJ-gwJ56-h1ZhIsB8bs6sTo1al1JCr_Jq32rS63lzKd6BNgvZ9IxVnLDT5l479RhK8DESJOB7GTgpovGVKruWXmKOTLcTZ9Hi_BXdWBcu7KzkS-M6D50XfLDsHhoSaXF-jRHuslCaZOpnSgM3-X_iA-hc7SH65xQt23qI9ILZTHNwZrbSJBpAnoEF0mgjaZETfH-HtcAPBzCHSW4wkcU" 
                alt="Car" 
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h4 className="font-headline font-bold text-on-surface">Vulcan Core</h4>
              <div className="flex gap-2 mt-1">
                <span className="font-label text-[10px] bg-surface-container-highest px-2 py-0.5 rounded text-primary uppercase">All-Electric</span>
                <span className="font-label text-[10px] bg-surface-container-highest px-2 py-0.5 rounded text-primary uppercase">Reserved</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Priority Leads */}
      <section className="space-y-4">
        <h2 className="font-headline text-lg font-bold tracking-tight text-on-surface">Priority Leads</h2>
        <div className="space-y-3">
          <div className="bg-surface-container-low rounded-[20pt] p-4 flex items-center justify-between border border-outline-variant/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">SM</div>
              <div>
                <p className="font-bold text-on-surface">Sarah Mitchell</p>
                <p className="text-xs text-on-surface-variant">Vulcan Core Inquiry</p>
              </div>
            </div>
            <span className="bg-error-container text-on-error-container px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-tighter">Hot</span>
          </div>
          <div className="bg-surface-container-low rounded-[20pt] p-4 flex items-center justify-between border border-outline-variant/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-bold">DL</div>
              <div>
                <p className="font-bold text-on-surface">David Lee</p>
                <p className="text-xs text-on-surface-variant">Scheduled Walkaround</p>
              </div>
            </div>
            <span className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-tighter">New</span>
          </div>
          <div className="bg-surface-container-low rounded-[20pt] p-4 flex items-center justify-between border border-outline-variant/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-tertiary-container/20 flex items-center justify-center text-tertiary font-bold">KB</div>
              <div>
                <p className="font-bold text-on-surface">Kiran Baxi</p>
                <p className="text-xs text-on-surface-variant">Finance Approval Pending</p>
              </div>
            </div>
            <span className="bg-surface-container-highest text-on-surface-variant px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-tighter">Follow-up</span>
          </div>
        </div>
      </section>
    </main>
    <BrochureViewerSheet isOpen={isBrochureOpen} onClose={() => setIsBrochureOpen(false)} />
    </>
  );
}
