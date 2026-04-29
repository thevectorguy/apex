import { Suspense, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { Canvas } from '@react-three/fiber';
import { AnimatePresence, motion, useDragControls } from 'motion/react';
import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  Check,
  FileText,
  Mail,
  MessageSquareText,
  Phone,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react';
import { Screen } from '../types';
import { CarModel } from '../components/CarModel';
import { readSearchParam } from '../lib/appRouter';
import { inventoryVehicleById, type InventoryVehicleId } from '../data/marutiVehicles';
import { shareBrochure } from '../lib/leadsApi';

type WheelOption = {
  id: string;
  name: string;
  finish: string;
  priceNote: string;
  detail: string;
};

type BrochureForm = {
  name: string;
  email: string;
  phone: string;
  note: string;
};

const colors = [
  { name: 'Lunar Silver Metallic', hex: '#C0C0C0' },
  { name: 'Phantom Black', hex: '#1A1A1A' },
  { name: 'Crimson Pearl', hex: '#8B0000' },
  { name: 'Abyss Blue', hex: '#000080' },
  { name: 'Dune Beige', hex: '#F5F5DC' },
];

const wheelOptions: WheelOption[] = [
  {
    id: 'aero-alloys',
    name: '18" Aero Alloys',
    finish: 'Touring Standard',
    priceNote: 'Included',
    detail: 'The quietest ride with a polished, full-face finish tuned for long, elegant drives.',
  },
  {
    id: 'sport-black',
    name: '19" Sport Black',
    finish: 'Performance Upgrade',
    priceNote: '+ Rs 45,000',
    detail: 'Diamond-cut spokes and a darker gloss barrel for a more assertive showroom stance.',
  },
];

const SHEET_COLLAPSED_PEEK = 180;

export function StudioConfigScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const requestedVehicle = readSearchParam('vehicle') as InventoryVehicleId | null;
  const vehicleKey: InventoryVehicleId = requestedVehicle && requestedVehicle in inventoryVehicleById ? requestedVehicle : 'brezza';
  const vehicle = inventoryVehicleById[vehicleKey];
  const [paintColor, setPaintColor] = useState(colors[0].hex);
  const [selectedWheel, setSelectedWheel] = useState(wheelOptions[0].id);
  const [sheetState, setSheetState] = useState<'collapsed' | 'expanded'>('collapsed');
  const [collapsedOffset, setCollapsedOffset] = useState(0);
  const [isBrochureModalOpen, setIsBrochureModalOpen] = useState(false);
  const [brochureStatus, setBrochureStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [lastBrochureLead, setLastBrochureLead] = useState<{ name: string; email: string } | null>(null);
  const [handoffNotice, setHandoffNotice] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [brochureForm, setBrochureForm] = useState<BrochureForm>({
    name: '',
    email: '',
    phone: '',
    note: '',
  });
  const sheetRef = useRef<HTMLElement | null>(null);
  const sheetHandleDraggedRef = useRef(false);
  const sheetDragControls = useDragControls();

  const activeColor = colors.find((color) => color.hex === paintColor) ?? colors[0];
  const activeWheel = wheelOptions.find((wheel) => wheel.id === selectedWheel) ?? wheelOptions[0];

  useLayoutEffect(() => {
    const sheetElement = sheetRef.current;
    if (!sheetElement || typeof window === 'undefined') {
      return;
    }

    const updateCollapsedOffset = () => {
      const nextOffset = Math.max(0, sheetElement.getBoundingClientRect().height - SHEET_COLLAPSED_PEEK);
      setCollapsedOffset(nextOffset);
    };

    updateCollapsedOffset();

    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateCollapsedOffset) : null;
    resizeObserver?.observe(sheetElement);
    window.addEventListener('resize', updateCollapsedOffset);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateCollapsedOffset);
    };
  }, []);

  useEffect(() => {
    if (!isBrochureModalOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isBrochureModalOpen]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const updateBrochureForm = (field: keyof BrochureForm, value: string) => {
    setBrochureForm((current) => ({ ...current, [field]: value }));
  };

  const handleOpenBrochureModal = () => {
    setBrochureStatus('idle');
    setSubmissionError(null);
    setIsBrochureModalOpen(true);
    setSheetState('expanded');
  };

  const handleCloseBrochureModal = () => {
    setBrochureStatus('idle');
    setSubmissionError(null);
    setIsBrochureModalOpen(false);
  };

  const handleSaveConfiguration = () => {
    setIsSaved(true);
    window.setTimeout(() => setIsSaved(false), 1800);
  };

  const handleSendBrochure = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBrochureStatus('sending');
    setSubmissionError(null);

    try {
      const result = await shareBrochure({
        brochureId: vehicle.id,
        brochureName: vehicle.brochureTitle,
        vehicleId: vehicle.id,
        vehicleLabel: `${vehicle.modelName} ${vehicle.variantName}`.trim(),
        customerName: brochureForm.name,
        email: brochureForm.email,
        phone: brochureForm.phone,
        note: brochureForm.note,
      });

      setBrochureStatus('sent');
      setLastBrochureLead({ name: result.item.lead.customerName, email: result.item.lead.email || brochureForm.email });
      setHandoffNotice(result.source === 'fallback' ? result.notice || 'Brochure handoff used fallback processing.' : result.notice || null);

      window.setTimeout(() => {
        setIsBrochureModalOpen(false);
        setBrochureStatus('idle');
        setBrochureForm({ name: '', email: '', phone: '', note: '' });
      }, 1800);
    } catch (error) {
      setBrochureStatus('idle');
      setSubmissionError(error instanceof Error ? error.message : 'Unable to send the brochure right now.');
    }
  };

  return (
    <>
      <main className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[radial-gradient(circle_at_top,rgba(0,122,255,0.14),transparent_36%),radial-gradient(circle_at_bottom,rgba(194,155,87,0.12),transparent_30%),linear-gradient(180deg,#f8fbff_0%,#eef4fa_46%,#f7f3ed_100%)] dark:bg-[#070709]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,122,255,0.08),transparent_36%),radial-gradient(circle_at_bottom,rgba(194,155,87,0.08),transparent_24%)] dark:bg-[radial-gradient(circle_at_top,rgba(164,201,255,0.16),transparent_36%),radial-gradient(circle_at_bottom,rgba(227,194,133,0.12),transparent_24%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-white/86 via-white/60 dark:from-black dark:via-black/80 to-transparent" />

        <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-4 pb-4 pt-8">
          <motion.button
            initial={{ opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onNavigate('catalog')}
            className="group inline-flex h-12 items-center gap-2 rounded-full border border-white/80 dark:border-white/10 bg-white/72 dark:bg-black/35 px-2 pr-4 text-on-surface dark:text-white shadow-[0_14px_38px_rgba(15,23,42,0.12)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.4)] backdrop-blur-xl ring-1 ring-slate-900/5 dark:ring-0"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 dark:bg-white/8 text-primary transition-colors group-hover:bg-primary/10 dark:group-hover:bg-primary/14">
              <ArrowLeft className="h-4 w-4" />
            </span>
            <span className="font-label text-[11px] font-semibold uppercase tracking-[0.24em] text-on-surface-variant dark:text-white/72">
              Products
            </span>
          </motion.button>

          <motion.div
            initial={{ opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, type: 'spring', stiffness: 280, damping: 24 }}
            className="flex items-center gap-2.5"
          >
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ y: -1 }}
              onClick={handleOpenBrochureModal}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/80 dark:border-white/10 bg-white/66 dark:bg-white/[0.07] text-slate-700 dark:text-white/80 shadow-[0_14px_38px_rgba(15,23,42,0.12)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-colors hover:bg-white/90 dark:hover:bg-white/[0.1] ring-1 ring-slate-900/5 dark:ring-0"
            >
              <ArrowUpRight className="h-4 w-4" />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.97 }}
              whileHover={{ y: -1 }}
              onClick={handleSaveConfiguration}
              className="relative inline-flex h-12 items-center gap-2 overflow-hidden rounded-full border border-primary/20 dark:border-primary/25 bg-[linear-gradient(135deg,rgba(0,122,255,0.08),rgba(255,255,255,0.8))] dark:bg-[linear-gradient(135deg,rgba(164,201,255,0.24),rgba(255,255,255,0.08))] px-4 text-primary dark:text-white shadow-apple-soft dark:shadow-[0_18px_45px_rgba(0,0,0,0.35)] backdrop-blur-xl"
            >
              <span className="absolute inset-0 animate-sheen bg-[linear-gradient(115deg,transparent_20%,rgba(255,255,255,0.6)_48%,transparent_72%)] dark:bg-[linear-gradient(115deg,transparent_20%,rgba(255,255,255,0.2)_48%,transparent_72%)] opacity-70" />
              <span className="relative flex items-center gap-2">
                <Bookmark className="h-4 w-4" />
                <span className="font-headline text-sm font-semibold tracking-wide">{isSaved ? 'Saved' : 'Save'}</span>
              </span>
            </motion.button>
          </motion.div>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 220, damping: 24 }}
          className="pointer-events-none absolute left-0 right-0 top-28 z-20 flex flex-col items-center px-6 text-center"
        >
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface dark:text-white drop-shadow-md">{vehicle.modelName}</h1>
          <p className="mt-1 font-label text-xs uppercase tracking-[0.28em] text-on-surface-variant dark:text-white/55">{vehicle.editionLabel}</p>
        </motion.div>

        <section
          className="absolute inset-0 z-10 h-full w-full cursor-grab active:cursor-grabbing"
          onClick={() => setSheetState('collapsed')}
        >
          <Canvas camera={{ position: [0, 2, 8], fov: 45 }}>
            <ambientLight intensity={0.5} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} castShadow />
            <Suspense fallback={null}>
              <CarModel color={paintColor} />
            </Suspense>
          </Canvas>

          <motion.div
            animate={{ y: [0, -6, 0], opacity: [0.3, 0.48, 0.3] }}
            transition={{ duration: 4.4, ease: 'easeInOut', repeat: Infinity }}
            className="pointer-events-none absolute bottom-[31%] left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3.5 py-2 text-white/70 backdrop-blur-xl"
          >
          </motion.div>
        </section>

        <motion.section
          ref={sheetRef}
          className="absolute bottom-0 left-0 right-0 z-40 flex flex-col overflow-hidden rounded-t-[2.75rem] border border-b-0 border-white/80 dark:border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(244,247,251,0.94))] dark:bg-[linear-gradient(180deg,rgba(34,36,44,0.4),rgba(9,10,14,0.28))] pt-3 shadow-[0_-18px_58px_rgba(15,23,42,0.14)] dark:shadow-[0_-22px_80px_rgba(0,0,0,0.46)] backdrop-blur-[28px] ring-1 ring-slate-900/5 dark:ring-0"
          initial={false}
          animate={{ y: sheetState === 'expanded' ? 0 : collapsedOffset }}
          transition={{ type: 'spring', damping: 26, stiffness: 290 }}
          drag="y"
          dragControls={sheetDragControls}
          dragListener={false}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.18}
          dragMomentum={false}
          onDragStart={() => {
            sheetHandleDraggedRef.current = true;
          }}
          onDragEnd={(_event, info) => {
            if (info.offset.y > 40 || info.velocity.y > 320) {
              setSheetState('collapsed');
            } else if (info.offset.y < -55 || info.velocity.y < -360) {
              setSheetState('expanded');
            }
            window.setTimeout(() => {
              sheetHandleDraggedRef.current = false;
            }, 80);
          }}
        >
          <div className="pointer-events-none absolute inset-0 rounded-t-[2.75rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.06)_20%,rgba(255,255,255,0.015)_42%,rgba(255,255,255,0.07)_100%)] opacity-55" />
          <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
          <div className="pointer-events-none absolute -left-8 top-0 h-20 w-40 rounded-full bg-white/18 blur-3xl" />
          <div className="pointer-events-none absolute -right-6 top-12 h-24 w-24 rounded-full bg-primary/10 blur-3xl" />

          <div
            className="w-full cursor-grab active:cursor-grabbing"
            onClick={() => {
              if (sheetHandleDraggedRef.current) {
                return;
              }
              setSheetState(sheetState === 'expanded' ? 'collapsed' : 'expanded');
            }}
            onPointerDown={(event) => sheetDragControls.start(event)}
            style={{ touchAction: 'none' }}
          >
            <div className="flex justify-center pb-4">
              <div className="h-1.5 w-12 rounded-full bg-slate-400/35 dark:bg-white/28 shadow-[0_1px_1px_rgba(255,255,255,0.18)]" />
            </div>
          </div>

          <div className="mx-auto w-full max-w-2xl space-y-6 px-6 pb-[calc(env(safe-area-inset-bottom)+1.75rem)]">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, type: 'spring', stiffness: 250, damping: 24 }}
            >
              <div className="mb-3 flex items-end justify-between gap-4">
                <div>
                  <p className="font-label text-[10px] uppercase tracking-[0.22em] text-on-surface-variant/70 dark:text-white/40">Finish Selection</p>
                  <h3 className="mt-1 font-headline text-xl font-semibold text-on-surface dark:text-white">Exterior Paint</h3>
                </div>
                <span className="max-w-[11rem] text-right font-body text-sm leading-5 text-on-surface-variant dark:text-white/62">{activeColor.name}</span>
              </div>

              <div className="-mx-2 flex gap-3 overflow-x-auto overflow-y-visible px-2 py-3 hide-scrollbar">
                {colors.map((color) => {
                  const isSelected = paintColor === color.hex;

                  return (
                    <motion.button
                      layout
                      key={color.hex}
                      whileHover={{ y: -2, scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={(event) => {
                        event.stopPropagation();
                        setPaintColor(color.hex);
                        setSheetState('expanded');
                      }}
                      className="relative flex h-[4.25rem] w-[4.25rem] flex-shrink-0 items-center justify-center rounded-[1.55rem] cursor-pointer"
                      aria-label={color.name}
                    >
                      {isSelected && (
                        <motion.span
                          layoutId="paint-halo"
                          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                          className="absolute inset-0 rounded-[1.55rem] bg-primary/10 shadow-[0_0_40px_rgba(164,201,255,0.18)]"
                        />
                      )}
                      <span
                        className={`absolute inset-[5px] rounded-[1.35rem] border ${
                          isSelected ? 'border-primary/60' : 'border-white/8'
                        } bg-white/[0.04]`}
                      />
                      <span
                        className="absolute inset-[11px] rounded-full shadow-[inset_0_2px_8px_rgba(255,255,255,0.18),0_16px_25px_rgba(0,0,0,0.42)]"
                        style={{ backgroundColor: color.hex }}
                      />
                      <span
                        className={`absolute inset-[14px] rounded-full border ${
                          isSelected ? 'border-white/55' : 'border-black/10'
                        }`}
                      />
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14, type: 'spring', stiffness: 250, damping: 24 }}
            >
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <p className="font-label text-[10px] uppercase tracking-[0.22em] text-on-surface-variant/70 dark:text-white/40">Performance Stance</p>
                  <h3 className="mt-1 font-headline text-xl font-semibold text-on-surface dark:text-white">Wheels</h3>
                </div>
                <span className="font-label text-[10px] uppercase tracking-[0.22em] text-on-surface-variant/70 dark:text-white/40">2 Finishes</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {wheelOptions.map((wheel) => {
                  const isSelected = selectedWheel === wheel.id;

                  return (
                    <motion.button
                      key={wheel.id}
                      layout
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelectedWheel(wheel.id);
                        setSheetState('expanded');
                      }}
                      className={`relative overflow-hidden rounded-[1.35rem] border px-4 py-4 text-left transition-colors ${
                        isSelected
                          ? 'border-primary/40 bg-primary/[0.08] shadow-[0_16px_32px_rgba(0,0,0,0.06)] dark:shadow-[0_16px_32px_rgba(0,0,0,0.2)]'
                          : 'border-slate-900/10 dark:border-white/10 bg-white/58 dark:bg-white/[0.045]'
                      }`}
                    >
                      <div
                        className={`absolute inset-0 opacity-80 ${
                          isSelected
                            ? 'bg-[radial-gradient(circle_at_top_right,rgba(164,201,255,0.16),transparent_55%)]'
                            : 'bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_55%)]'
                        }`}
                      />
                      <div className="relative">
                        <p className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant/70 dark:text-white/44">{wheel.finish}</p>
                        <h4 className="mt-2 font-headline text-base font-semibold leading-tight text-on-surface dark:text-white">{wheel.name}</h4>
                        <div className="mt-4 flex items-center justify-between gap-3">
                          <p className={`font-label text-[11px] uppercase tracking-[0.18em] ${isSelected ? 'text-primary' : 'text-on-surface-variant dark:text-white/52'}`}>
                            {wheel.priceNote}
                          </p>
                          {isSelected && (
                            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/35 bg-primary/14 text-primary">
                              <Check className="h-4 w-4" />
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 250, damping: 24 }}
              className="border-t border-white/10 pt-5"
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="flex-1 rounded-[1.2rem] border border-black/5 dark:border-white/12 bg-black/5 dark:bg-white/[0.06] px-4 py-3.5 font-headline text-sm font-semibold text-on-surface dark:text-white shadow-[inset_0_1px_0_rgba(0,0,0,0.05)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-xl transition-colors hover:bg-black/10 dark:hover:bg-white/[0.08]"
                >
                  Finance
                </button>
                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={handleOpenBrochureModal}
                  className="relative flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-[1.2rem] border border-[#ffaa33]/30 dark:border-secondary/22 bg-[#ffaa33]/10 dark:bg-[linear-gradient(135deg,rgba(227,194,133,0.2),rgba(255,255,255,0.08))] px-4 py-3.5 font-headline text-sm font-semibold text-[#b36b00] dark:text-white shadow-sm dark:shadow-[0_14px_32px_rgba(0,0,0,0.22)] backdrop-blur-xl"
                >
                  <span className="absolute inset-0 animate-sheen bg-[linear-gradient(115deg,transparent_20%,rgba(255,255,255,0.5)_48%,transparent_74%)] dark:bg-[linear-gradient(115deg,transparent_20%,rgba(255,255,255,0.16)_48%,transparent_74%)] opacity-70" />
                  <span className="relative flex items-center gap-2">
                    <Mail className="h-4 w-4 text-[#ffaa33] dark:text-secondary" />
                    <span>Brochure</span>
                  </span>
                </motion.button>
              </div>

              {lastBrochureLead && (
                <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full border border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/[0.05] px-3 py-2">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-secondary" />
                  <span className="truncate font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant dark:text-white/68">
                    Last queued for {lastBrochureLead.name} · {lastBrochureLead.email}
                  </span>
                </div>
              )}

              {handoffNotice && (
                <div className="mt-3 rounded-[18pt] border border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/[0.04] px-4 py-3 text-sm text-on-surface-variant dark:text-white/68">
                  {handoffNotice}
                </div>
              )}
            </motion.div>
          </div>
        </motion.section>
      </main>

      <AnimatePresence>
        {isBrochureModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseBrochureModal}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, y: 28, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24 }}
              className="fixed inset-x-3 bottom-3 top-3 z-[60] mx-auto flex w-auto max-w-md flex-col overflow-hidden rounded-[2rem] border border-black/5 dark:border-white/10 bg-white dark:bg-[linear-gradient(180deg,rgba(28,28,34,0.98),rgba(12,12,16,0.98))] shadow-apple dark:shadow-[0_28px_90px_rgba(0,0,0,0.55)] sm:inset-x-4 sm:bottom-6 sm:top-auto sm:max-h-[calc(100dvh-3rem)]"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(0,122,255,0.08),transparent_68%)] dark:bg-[radial-gradient(circle_at_top,rgba(164,201,255,0.16),transparent_68%)]" />
              <div className="pointer-events-none absolute -bottom-10 right-0 h-28 w-28 rounded-full bg-secondary/10 blur-3xl" />

              <div className="relative flex min-h-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-4 px-5 pb-0 pt-5 sm:px-6 sm:pt-6">
                  <div>
                    <p className="font-label text-[10px] uppercase tracking-[0.24em] text-on-surface-variant/70 dark:text-white/42">Brochure Handoff</p>
                    <h2 className="mt-2 font-headline text-xl font-bold leading-tight text-on-surface dark:text-white sm:text-2xl">Send the {vehicle.brochureTitle} brochure</h2>
                    <p className="mt-2 text-sm leading-6 text-on-surface-variant dark:text-white/60">
                      Capture the customer details here and keep the brochure handoff inside this modal.
                    </p>
                  </div>

                  <button
                    onClick={handleCloseBrochureModal}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/[0.06] text-on-surface-variant dark:text-white/72 transition-colors hover:bg-black/10 dark:hover:bg-white/[0.1]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="min-h-0 overflow-y-auto px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/[0.05] px-3 py-1.5 font-label text-[10px] uppercase tracking-[0.16em] text-on-surface-variant dark:text-white/62">
                      {activeColor.name}
                    </span>
                    <span className="rounded-full border border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/[0.05] px-3 py-1.5 font-label text-[10px] uppercase tracking-[0.16em] text-on-surface-variant dark:text-white/62">
                      {activeWheel.name}
                    </span>
                  </div>

                  <AnimatePresence mode="wait">
                    {brochureStatus === 'sent' ? (
                      <motion.div
                        key="brochure-success"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="mt-6 rounded-[1.45rem] border border-secondary/18 bg-secondary/10 p-4 sm:rounded-[1.6rem] sm:p-5"
                      >
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-on-secondary-fixed sm:h-12 sm:w-12">
                          <Check className="h-5 w-5" />
                        </div>
                        <h3 className="mt-4 font-headline text-lg font-semibold text-on-surface dark:text-white sm:text-xl">Brochure queued</h3>
                        <p className="mt-2 text-sm leading-6 text-on-surface-variant dark:text-white/62">
                          {brochureForm.name}'s brochure handoff has been captured. You can continue from here without opening another screen.
                        </p>
                      </motion.div>
                    ) : (
                      <motion.form
                        key="brochure-form"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        onSubmit={handleSendBrochure}
                        className="mt-5 space-y-3.5 sm:mt-6 sm:space-y-4"
                      >
                        {submissionError && (
                          <div className="rounded-[1.2rem] border border-error/20 bg-error-container/80 px-4 py-3 text-sm text-on-error-container">
                            {submissionError}
                          </div>
                        )}

                        <label className="block">
                          <span className="mb-2 block font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant/70 dark:text-white/42">Customer Name</span>
                          <div className="relative">
                            <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant/70 dark:text-white/35" />
                            <input
                              type="text"
                              required
                              value={brochureForm.name}
                              onChange={(event) => updateBrochureForm('name', event.target.value)}
                              placeholder="Aarav Mehta"
                              className="w-full rounded-[1.2rem] border border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/[0.05] py-3.5 pl-11 pr-4 text-sm text-on-surface dark:text-white outline-none transition focus:border-primary/45 focus:bg-black/10 dark:focus:bg-white/[0.08] placeholder:text-on-surface-variant/50 dark:placeholder:text-white/22"
                            />
                          </div>
                        </label>

                        <label className="block">
                          <span className="mb-2 block font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant/70 dark:text-white/42">Email</span>
                          <div className="relative">
                            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant/70 dark:text-white/35" />
                            <input
                              type="email"
                              required
                              value={brochureForm.email}
                              onChange={(event) => updateBrochureForm('email', event.target.value)}
                              placeholder="customer@example.com"
                              className="w-full rounded-[1.2rem] border border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/[0.05] py-3.5 pl-11 pr-4 text-sm text-on-surface dark:text-white outline-none transition focus:border-primary/45 focus:bg-black/10 dark:focus:bg-white/[0.08] placeholder:text-on-surface-variant/50 dark:placeholder:text-white/22"
                            />
                          </div>
                        </label>

                        <label className="block">
                          <span className="mb-2 block font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant/70 dark:text-white/42">Phone</span>
                          <div className="relative">
                            <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant/70 dark:text-white/35" />
                            <input
                              type="tel"
                              value={brochureForm.phone}
                              onChange={(event) => updateBrochureForm('phone', event.target.value)}
                              placeholder="+91 98XXXXXX42"
                              className="w-full rounded-[1.2rem] border border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/[0.05] py-3.5 pl-11 pr-4 text-sm text-on-surface dark:text-white outline-none transition focus:border-primary/45 focus:bg-black/10 dark:focus:bg-white/[0.08] placeholder:text-on-surface-variant/50 dark:placeholder:text-white/22"
                            />
                          </div>
                        </label>

                        <label className="block">
                          <span className="mb-2 block font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant/70 dark:text-white/42">Sales Note</span>
                          <div className="relative">
                            <MessageSquareText className="pointer-events-none absolute left-4 top-4 h-4 w-4 text-on-surface-variant/70 dark:text-white/35" />
                            <textarea
                              rows={3}
                              value={brochureForm.note}
                              onChange={(event) => updateBrochureForm('note', event.target.value)}
                              placeholder="Interested in lunar silver finish and delivery timeline."
                              className="w-full resize-none rounded-[1.2rem] border border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/[0.05] py-3.5 pl-11 pr-4 text-sm text-on-surface dark:text-white outline-none transition focus:border-primary/45 focus:bg-black/10 dark:focus:bg-white/[0.08] placeholder:text-on-surface-variant/50 dark:placeholder:text-white/22"
                            />
                          </div>
                        </label>

                        <div className="rounded-[1.25rem] border border-black/5 dark:border-white/8 bg-black/5 dark:bg-white/[0.04] p-4 sm:rounded-[1.35rem]">
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary/12 text-secondary">
                              <FileText className="h-[18px] w-[18px]" />
                            </div>
                            <div>
                              <p className="font-headline text-sm font-semibold text-on-surface dark:text-white">Demo-ready workflow</p>
                              <p className="mt-1 text-sm leading-6 text-on-surface-variant dark:text-white/58">
                                This keeps the brochure flow focused on collecting the lead details and confirming the handoff right here.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="sticky bottom-0 -mx-5 mt-2 border-t border-black/5 dark:border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.8),rgba(255,255,255,0.94))] dark:bg-[linear-gradient(180deg,rgba(12,12,16,0.12),rgba(12,12,16,0.94))] px-5 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-4 backdrop-blur-xl sm:static sm:mx-0 sm:mt-0 sm:border-t-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-2 sm:backdrop-blur-none">
                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={handleCloseBrochureModal}
                              className="rounded-[1.2rem] border border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/[0.04] px-4 py-3.5 font-headline text-sm font-semibold text-on-surface-variant dark:text-white/72 transition-colors hover:bg-black/10 dark:hover:bg-white/[0.08]"
                            >
                              Cancel
                            </button>

                            <motion.button
                              whileTap={{ scale: 0.985 }}
                              type="submit"
                              disabled={brochureStatus === 'sending'}
                              className="relative flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-[1.2rem] border border-primary/30 dark:border-primary/22 bg-primary/10 dark:bg-[linear-gradient(135deg,rgba(164,201,255,0.24),rgba(255,255,255,0.08))] px-4 py-3.5 font-headline text-sm font-semibold text-primary dark:text-white shadow-sm dark:shadow-[0_16px_40px_rgba(0,0,0,0.28)] disabled:cursor-default disabled:opacity-75 transition-colors hover:bg-primary/20 dark:hover:bg-[linear-gradient(135deg,rgba(164,201,255,0.34),rgba(255,255,255,0.12))]"
                            >
                              <span className="absolute inset-0 animate-sheen bg-[linear-gradient(115deg,transparent_20%,rgba(255,255,255,0.6)_48%,transparent_72%)] dark:bg-[linear-gradient(115deg,transparent_20%,rgba(255,255,255,0.18)_48%,transparent_74%)] opacity-70" />
                              <span className="relative flex items-center gap-2">
                              {brochureStatus === 'sending' ? (
                                <span className="h-4 w-4 rounded-full border-2 border-white/25 border-t-white animate-spin" />
                              ) : (
                                <Mail className="h-4 w-4" />
                              )}
                              <span>{brochureStatus === 'sending' ? 'Sending brochure...' : 'Send brochure'}</span>
                            </span>
                          </motion.button>
                          </div>
                        </div>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
