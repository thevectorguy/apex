export function TopAppBar() {
  return (
    <header className="fixed top-0 w-full z-50 bg-neutral-900/40 backdrop-blur-xl flex justify-between items-center px-6 h-16 w-full">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-[#a4c9ff]" style={{ fontVariationSettings: "'FILL' 0" }} data-icon="menu">menu</span>
        <span className="font-headline text-xl font-bold tracking-tighter text-[#e4e1e9]">DILOS</span>
      </div>
      <div className="h-10 w-10 rounded-full border-2 border-[#a4c9ff]/30 overflow-hidden">
        <img alt="User profile" className="h-full w-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAPQTULceKr6j45xJCD4GWbBSq6jE0-mkdsKq3N4HqppI0uBMrLl1eK9ki6aNStOEbdrhGsdp5GwybQPHrj-LkM1-GoNYuqKDrNsyugsSmSNv1VTNCYlHPczEVB7T4WueeIUdbS-PLYNYqQv-qnWZL9sthU8iVlrBdqek3OU_dRGDxl0AuCqIseFjIVzmthxH3zWZaJIcgjec3uh1x36IqHDN6H8G9i6sJckCJpmx1MuYuPeabGW_vRchqBRO_QwqRRTLEt_FxQok4" />
      </div>
    </header>
  );
}
