import { Suspense, useEffect, useRef, useState, type FormEvent } from 'react';
import { Canvas } from '@react-three/fiber';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  Check,
  FileText,
  Gem,
  Mail,
  MessageSquareText,
  Phone,
  Plus,
  ShieldCheck,
  Sparkles,
  SunMedium,
  UserRound,
  Waves,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Screen } from '../types';
import { CarModel } from '../components/CarModel';

type WheelOption = {
  id: string;
  name: string;
  finish: string;
  priceNote: string;
  detail: string;
};

type AccessoryOption = {
  id: string;
  name: string;
  detail: string;
  priceNote: string;
  icon: LucideIcon;
  accentClassName: string;
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

const accessoryOptions: AccessoryOption[] = [
  {
    id: 'ambient-suite',
    name: 'Ambient Suite',
    detail: 'Layered cabin illumination with lounge-inspired mood presets.',
    priceNote: '+ Rs 18,000',
    icon: Sparkles,
    accentClassName: 'bg-[linear-gradient(135deg,rgba(227,194,133,0.95),rgba(91,64,16,0.9))]',
  },
  {
    id: 'sky-roof',
    name: 'Panoramic Shade',
    detail: 'Electrochromic roof glazing with a calmer, brighter day-drive feel.',
    priceNote: '+ Rs 28,000',
    icon: SunMedium,
    accentClassName: 'bg-[linear-gradient(135deg,rgba(164,201,255,0.95),rgba(22,66,118,0.9))]',
  },
  {
    id: 'comfort-shield',
    name: 'Comfort Shield',
    detail: 'Acoustic mats and premium edge trims for a more hushed cabin.',
    priceNote: '+ Rs 16,500',
    icon: ShieldCheck,
    accentClassName: 'bg-[linear-gradient(135deg,rgba(155,168,190,0.95),rgba(39,49,65,0.9))]',
  },
  {
    id: 'concierge-kit',
    name: 'Concierge Kit',
    detail: 'Textured cargo pieces, umbrella sleeve, and tailored travel inserts.',
    priceNote: '+ Rs 12,000',
    icon: Gem,
    accentClassName: 'bg-[linear-gradient(135deg,rgba(197,198,206,0.92),rgba(74,79,92,0.9))]',
  },
  {
    id: 'sound-capsule',
    name: 'Sound Capsule',
    detail: 'Signature welcome chime and tuned surround voicing for richer playback.',
    priceNote: '+ Rs 22,000',
    icon: Waves,
    accentClassName: 'bg-[linear-gradient(135deg,rgba(137,182,255,0.92),rgba(22,37,86,0.92))]',
  },
];

function sanitizePdfText(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function createDemoBrochurePdf({
  customerName,
  customerEmail,
  phone,
  paintName,
  wheelName,
  accessories,
  salesNote,
}: {
  customerName: string;
  customerEmail: string;
  phone: string;
  paintName: string;
  wheelName: string;
  accessories: string[];
  salesNote: string;
}) {
  const lines = [
    'Elevate Touring Edition',
    `Prepared for ${customerName || 'Walk-in guest'}`,
    `Email: ${customerEmail}`,
    phone ? `Phone: ${phone}` : 'Phone: showroom follow-up pending',
    `Exterior paint: ${paintName}`,
    `Wheel package: ${wheelName}`,
    `Accessories: ${accessories.length ? accessories.join(', ') : 'No curated accessories selected'}`,
    salesNote ? `Note: ${salesNote}` : 'Note: Sample brochure prepared in studio mode.',
  ].map((line) => sanitizePdfText(line).slice(0, 108));

  const streamParts = ['BT', '/F1 30 Tf', '72 724 Td', `(${lines[0]}) Tj`, '/F1 16 Tf'];
  lines.slice(1).forEach((line, index) => {
    streamParts.push(index === 0 ? '0 -42 Td' : '0 -26 Td');
    streamParts.push(`(${line}) Tj`);
  });
  streamParts.push('ET');

  const stream = streamParts.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  objects.forEach((objectBody, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${objectBody}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${offset.toString().padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: 'application/pdf' });
}

function writeBrochureHoldingPage(targetWindow: Window) {
  try {
    targetWindow.document.open();
    targetWindow.document.write(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Preparing Elevate brochure</title>
  </head>
  <body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#070709;color:#f5f7fb;font-family:Inter,Arial,sans-serif;">
    <div style="max-width:420px;padding:40px 32px;border:1px solid rgba(255,255,255,0.08);border-radius:28px;background:linear-gradient(145deg,rgba(28,28,34,0.92),rgba(12,12,16,0.96));box-shadow:0 30px 80px rgba(0,0,0,0.45);">
      <p style="margin:0;font-size:11px;letter-spacing:0.24em;text-transform:uppercase;color:rgba(245,247,251,0.48);">Studio Preview</p>
      <h1 style="margin:18px 0 8px;font-size:32px;line-height:1.05;">Preparing the Elevate brochure</h1>
      <p style="margin:0;color:rgba(245,247,251,0.68);line-height:1.6;">Return to the configurator to enter the lead's details. The sample PDF will load here automatically.</p>
    </div>
  </body>
</html>`);
    targetWindow.document.close();
  } catch {
    // The preview tab is best-effort for demo flow only.
  }
}

export function StudioConfigScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [paintColor, setPaintColor] = useState(colors[0].hex);
  const [selectedWheel, setSelectedWheel] = useState(wheelOptions[0].id);
  const [selectedAccessories, setSelectedAccessories] = useState<string[]>(['ambient-suite', 'comfort-shield']);
  const [sheetState, setSheetState] = useState<'collapsed' | 'expanded'>('expanded');
  const [isBrochureModalOpen, setIsBrochureModalOpen] = useState(false);
  const [brochureStatus, setBrochureStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [lastBrochureLead, setLastBrochureLead] = useState<{ name: string; email: string } | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [brochureForm, setBrochureForm] = useState<BrochureForm>({
    name: '',
    email: '',
    phone: '',
    note: '',
  });
  const brochureWindowRef = useRef<Window | null>(null);
  const brochureUrlRef = useRef<string | null>(null);

  const activeColor = colors.find((color) => color.hex === paintColor) ?? colors[0];
  const activeWheel = wheelOptions.find((wheel) => wheel.id === selectedWheel) ?? wheelOptions[0];
  const activeAccessories = accessoryOptions.filter((item) => selectedAccessories.includes(item.id));

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
      if (brochureUrlRef.current) {
        URL.revokeObjectURL(brochureUrlRef.current);
      }
      document.body.style.overflow = '';
    };
  }, []);

  const toggleAccessory = (accessoryId: string) => {
    setSelectedAccessories((current) =>
      current.includes(accessoryId) ? current.filter((id) => id !== accessoryId) : [...current, accessoryId],
    );
    setSheetState('expanded');
  };

  const updateBrochureForm = (field: keyof BrochureForm, value: string) => {
    setBrochureForm((current) => ({ ...current, [field]: value }));
  };

  const handleOpenBrochureModal = () => {
    if (typeof window !== 'undefined') {
      const previewWindow =
        brochureWindowRef.current && !brochureWindowRef.current.closed
          ? brochureWindowRef.current
          : window.open('', 'elevate-brochure-demo');

      if (previewWindow) {
        brochureWindowRef.current = previewWindow;
        writeBrochureHoldingPage(previewWindow);
        previewWindow.blur();
        window.focus();
      }
    }

    setBrochureStatus('idle');
    setIsBrochureModalOpen(true);
    setSheetState('expanded');
  };

  const handleCloseBrochureModal = () => {
    setBrochureStatus('idle');
    setIsBrochureModalOpen(false);
  };

  const handleSaveConfiguration = () => {
    setIsSaved(true);
    window.setTimeout(() => setIsSaved(false), 1800);
  };

  const handleSendBrochure = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBrochureStatus('sending');

    const brochureBlob = createDemoBrochurePdf({
      customerName: brochureForm.name,
      customerEmail: brochureForm.email,
      phone: brochureForm.phone,
      paintName: activeColor.name,
      wheelName: activeWheel.name,
      accessories: activeAccessories.map((item) => item.name),
      salesNote: brochureForm.note,
    });

    if (brochureUrlRef.current) {
      URL.revokeObjectURL(brochureUrlRef.current);
    }

    const brochureUrl = URL.createObjectURL(brochureBlob);
    brochureUrlRef.current = brochureUrl;

    const previewWindow =
      brochureWindowRef.current && !brochureWindowRef.current.closed
        ? brochureWindowRef.current
        : window.open('', 'elevate-brochure-demo');

    if (previewWindow) {
      brochureWindowRef.current = previewWindow;
      previewWindow.location.href = brochureUrl;
      previewWindow.blur();
      window.focus();
    } else {
      window.open(brochureUrl, '_blank');
    }

    window.setTimeout(() => {
      setBrochureStatus('sent');
      setLastBrochureLead({ name: brochureForm.name, email: brochureForm.email });
    }, 320);

    window.setTimeout(() => {
      setIsBrochureModalOpen(false);
      setBrochureStatus('idle');
      setBrochureForm({ name: '', email: '', phone: '', note: '' });
    }, 1800);
  };

  return (
    <>
      <main className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[#070709]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(164,201,255,0.16),transparent_36%),radial-gradient(circle_at_bottom,rgba(227,194,133,0.12),transparent_24%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-black via-black/80 to-transparent" />

        <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-4 pb-4 pt-8">
          <motion.button
            initial={{ opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onNavigate('catalog')}
            className="group inline-flex h-12 items-center gap-2 rounded-full border border-white/10 bg-black/35 px-2 pr-4 text-white shadow-[0_16px_40px_rgba(0,0,0,0.4)] backdrop-blur-xl"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/8 text-primary transition-colors group-hover:bg-primary/14">
              <ArrowLeft className="h-4 w-4" />
            </span>
            <span className="font-label text-[11px] font-semibold uppercase tracking-[0.24em] text-white/72">
              Catalog
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
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.07] text-white/80 shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-colors hover:bg-white/[0.1]"
            >
              <ArrowUpRight className="h-4 w-4" />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.97 }}
              whileHover={{ y: -1 }}
              onClick={handleSaveConfiguration}
              className="relative inline-flex h-12 items-center gap-2 overflow-hidden rounded-full border border-primary/25 bg-[linear-gradient(135deg,rgba(164,201,255,0.24),rgba(255,255,255,0.08))] px-4 text-white shadow-[0_18px_45px_rgba(0,0,0,0.35)] backdrop-blur-xl"
            >
              <span className="absolute inset-0 animate-sheen bg-[linear-gradient(115deg,transparent_20%,rgba(255,255,255,0.2)_48%,transparent_72%)] opacity-70" />
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
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-white drop-shadow-md">Elevate</h1>
          <p className="mt-1 font-label text-xs uppercase tracking-[0.28em] text-white/55">Touring Edition</p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 py-2 backdrop-blur-xl">
            <Sparkles className="h-3.5 w-3.5 text-secondary" />
            <span className="font-label text-[10px] uppercase tracking-[0.24em] text-white/65">
              Bespoke Studio Preview
            </span>
          </div>
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
            <Sparkles className="h-3.5 w-3.5 text-secondary" />
            <span className="font-label text-[10px] uppercase tracking-[0.22em]">Swipe to orbit</span>
          </motion.div>
        </section>

        <motion.section
          className="absolute bottom-0 left-0 right-0 z-40 flex flex-col overflow-visible rounded-t-[2.75rem] border-t border-white/10 bg-[linear-gradient(180deg,rgba(28,28,34,0.94),rgba(12,12,16,0.98))] pt-3 shadow-[0_-30px_90px_rgba(0,0,0,0.65)] backdrop-blur-3xl"
          initial={false}
          animate={sheetState === 'expanded' ? { y: 0 } : { y: '66%' }}
          transition={{ type: 'spring', damping: 26, stiffness: 290 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.18}
          onDragEnd={(_event, info) => {
            if (info.offset.y > 50) {
              setSheetState('collapsed');
            } else if (info.offset.y < -50) {
              setSheetState('expanded');
            }
          }}
        >
          <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_66%)] opacity-70" />

          <div
            className="w-full cursor-grab active:cursor-grabbing"
            onClick={() => setSheetState(sheetState === 'expanded' ? 'collapsed' : 'expanded')}
          >
            <div className="flex justify-center pb-4">
              <div className="h-1.5 w-12 rounded-full bg-white/20" />
            </div>
          </div>

          <div className="mx-auto w-full max-w-2xl space-y-7 px-6 pb-10">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, type: 'spring', stiffness: 250, damping: 24 }}
            >
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <p className="font-label text-[10px] uppercase tracking-[0.22em] text-white/40">Finish Selection</p>
                  <h3 className="mt-1 font-headline text-xl font-semibold text-white">Exterior Paint</h3>
                </div>
                <span className="max-w-[11rem] text-right font-body text-sm leading-5 text-white/62">{activeColor.name}</span>
              </div>

              <div className="-mx-2 flex gap-3 overflow-x-auto overflow-y-visible px-2 py-4 hide-scrollbar">
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
                      className="relative flex h-[4.55rem] w-[4.55rem] flex-shrink-0 items-center justify-center rounded-[1.75rem] cursor-pointer"
                      aria-label={color.name}
                    >
                      {isSelected && (
                        <motion.span
                          layoutId="paint-halo"
                          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                          className="absolute inset-0 rounded-[1.75rem] bg-primary/12 shadow-[0_0_40px_rgba(164,201,255,0.2)]"
                        />
                      )}
                      <span
                        className={`absolute inset-[5px] rounded-[1.5rem] border ${
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
                  <p className="font-label text-[10px] uppercase tracking-[0.22em] text-white/40">Performance Stance</p>
                  <h3 className="mt-1 font-headline text-xl font-semibold text-white">Wheels</h3>
                </div>
                <span className="font-label text-[10px] uppercase tracking-[0.22em] text-white/40">2 Finishes</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {wheelOptions.map((wheel) => {
                  const isSelected = selectedWheel === wheel.id;

                  return (
                    <motion.button
                      key={wheel.id}
                      layout
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelectedWheel(wheel.id);
                        setSheetState('expanded');
                      }}
                      className={`relative overflow-hidden rounded-[1.55rem] border p-4 text-left transition-colors ${
                        isSelected
                          ? 'border-primary/45 bg-primary/[0.08] shadow-[0_22px_45px_rgba(0,0,0,0.24)]'
                          : 'border-white/8 bg-white/[0.04]'
                      }`}
                    >
                      <div
                        className={`absolute inset-0 opacity-80 ${
                          isSelected
                            ? 'bg-[radial-gradient(circle_at_top_right,rgba(164,201,255,0.16),transparent_55%)]'
                            : 'bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_55%)]'
                        }`}
                      />
                      <div className="relative flex items-start justify-between gap-3">
                        <div>
                          <p className="font-label text-[10px] uppercase tracking-[0.18em] text-white/44">{wheel.finish}</p>
                          <h4 className="mt-2 font-headline text-lg font-semibold leading-tight text-white">{wheel.name}</h4>
                        </div>
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-full border ${
                            isSelected
                              ? 'border-primary/35 bg-primary/14 text-primary'
                              : 'border-white/10 bg-white/[0.04] text-white/45'
                          }`}
                        >
                          {isSelected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        </span>
                      </div>
                      <p className="relative mt-4 font-label text-[11px] uppercase tracking-[0.18em] text-primary">{wheel.priceNote}</p>
                      <p className="relative mt-3 text-sm leading-6 text-white/55">{wheel.detail}</p>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 250, damping: 24 }}
            >
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <p className="font-label text-[10px] uppercase tracking-[0.22em] text-white/40">Curated Add-Ons</p>
                  <h3 className="mt-1 font-headline text-xl font-semibold text-white">Accessories</h3>
                </div>
                <span className="font-label text-[10px] uppercase tracking-[0.22em] text-white/40">{selectedAccessories.length} Selected</span>
              </div>

              <div className="-mx-1 flex gap-3 overflow-x-auto px-1 py-2 hide-scrollbar">
                {accessoryOptions.map((accessory) => {
                  const isSelected = selectedAccessories.includes(accessory.id);
                  const Icon = accessory.icon;

                  return (
                    <motion.button
                      key={accessory.id}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => toggleAccessory(accessory.id)}
                      className={`group relative flex min-w-[11rem] flex-shrink-0 flex-col rounded-[1.6rem] border p-4 text-left transition-colors ${
                        isSelected
                          ? 'border-white/16 bg-white/[0.08] shadow-[0_20px_44px_rgba(0,0,0,0.22)]'
                          : 'border-white/8 bg-white/[0.04]'
                      }`}
                    >
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-2xl ${accessory.accentClassName} shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)]`}
                      >
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <h4 className="mt-4 font-headline text-base font-semibold text-white">{accessory.name}</h4>
                      <p className="mt-2 text-sm leading-5 text-white/58">{accessory.detail}</p>
                      <div className="mt-4 flex items-center justify-between">
                        <span
                          className={`font-label text-[11px] uppercase tracking-[0.18em] ${
                            isSelected ? 'text-secondary' : 'text-white/45'
                          }`}
                        >
                          {accessory.priceNote}
                        </span>
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-full border ${
                            isSelected
                              ? 'border-secondary/35 bg-secondary/14 text-secondary'
                              : 'border-white/10 bg-white/[0.04] text-white/40'
                          }`}
                        >
                          {isSelected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.26, type: 'spring', stiffness: 250, damping: 24 }}
              className="relative overflow-hidden rounded-[1.85rem] border border-white/10 bg-[linear-gradient(140deg,rgba(164,201,255,0.12),rgba(255,255,255,0.04)_28%,rgba(227,194,133,0.12)_100%)] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.25)]"
            >
              <div className="pointer-events-none absolute -right-8 top-0 h-32 w-32 rounded-full bg-primary/12 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-10 left-0 h-28 w-28 rounded-full bg-secondary/12 blur-3xl" />

              <div className="relative">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-primary backdrop-blur-xl">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-label text-[10px] uppercase tracking-[0.24em] text-white/45">Brochure Handoff</p>
                    <h3 className="mt-2 font-headline text-xl font-semibold leading-tight text-white">
                      Open a polished brochure while you capture the lead.
                    </h3>
                  </div>
                </div>

                <p className="mt-4 max-w-[21rem] text-sm leading-6 text-white/62">
                  Replace the finance footer with a demo-ready lead capture flow. The modal collects the customer details and opens a sample PDF brochure preview for the showroom walkthrough.
                </p>

                {lastBrochureLead && (
                  <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-secondary" />
                    <span className="truncate font-label text-[10px] uppercase tracking-[0.18em] text-white/68">
                      Last queued for {lastBrochureLead.name} · {lastBrochureLead.email}
                    </span>
                  </div>
                )}

                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={handleOpenBrochureModal}
                  className="relative mt-5 flex w-full items-center justify-between overflow-hidden rounded-[1.35rem] border border-secondary/20 bg-[linear-gradient(135deg,rgba(227,194,133,0.24),rgba(255,255,255,0.09))] px-5 py-4 text-left shadow-[0_18px_45px_rgba(0,0,0,0.26)]"
                >
                  <span className="absolute inset-0 animate-sheen bg-[linear-gradient(115deg,transparent_16%,rgba(255,255,255,0.18)_46%,transparent_74%)] opacity-70" />
                  <span className="relative flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary/16 text-secondary">
                      <Mail className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block font-headline text-base font-semibold text-white">Brochure</span>
                      <span className="block font-body text-sm text-white/58">Capture lead + open sample PDF</span>
                    </span>
                  </span>
                  <ArrowUpRight className="relative h-5 w-5 text-white/72" />
                </motion.button>
              </div>
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
              className="fixed inset-x-4 bottom-6 z-[60] mx-auto max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(28,28,34,0.98),rgba(12,12,16,0.98))] shadow-[0_28px_90px_rgba(0,0,0,0.55)]"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(164,201,255,0.16),transparent_68%)]" />
              <div className="pointer-events-none absolute -bottom-10 right-0 h-28 w-28 rounded-full bg-secondary/10 blur-3xl" />

              <div className="relative p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-label text-[10px] uppercase tracking-[0.24em] text-white/42">Brochure Handoff</p>
                    <h2 className="mt-2 font-headline text-2xl font-bold leading-tight text-white">Send the Elevate brochure</h2>
                    <p className="mt-2 text-sm leading-6 text-white/60">
                      Capture the customer details now. A sample PDF preview will open in a background tab for the showroom demo as soon as you confirm.
                    </p>
                  </div>

                  <button
                    onClick={handleCloseBrochureModal}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/72 transition-colors hover:bg-white/[0.1]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 font-label text-[10px] uppercase tracking-[0.16em] text-white/62">
                    {activeColor.name}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 font-label text-[10px] uppercase tracking-[0.16em] text-white/62">
                    {activeWheel.name}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 font-label text-[10px] uppercase tracking-[0.16em] text-white/62">
                    {activeAccessories.length} accessories selected
                  </span>
                </div>

                <AnimatePresence mode="wait">
                  {brochureStatus === 'sent' ? (
                    <motion.div
                      key="brochure-success"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="mt-6 rounded-[1.6rem] border border-secondary/18 bg-secondary/10 p-5"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-on-secondary-fixed">
                        <Check className="h-5 w-5" />
                      </div>
                      <h3 className="mt-4 font-headline text-xl font-semibold text-white">Brochure queued</h3>
                      <p className="mt-2 text-sm leading-6 text-white/62">
                        {brochureForm.name}'s sample PDF is opening in the preview tab now. This stays demo-safe while still showing the end-to-end premium handoff.
                      </p>
                    </motion.div>
                  ) : (
                    <motion.form
                      key="brochure-form"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      onSubmit={handleSendBrochure}
                      className="mt-6 space-y-4"
                    >
                      <label className="block">
                        <span className="mb-2 block font-label text-[10px] uppercase tracking-[0.18em] text-white/42">Customer Name</span>
                        <div className="relative">
                          <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                          <input
                            type="text"
                            required
                            value={brochureForm.name}
                            onChange={(event) => updateBrochureForm('name', event.target.value)}
                            placeholder="Aarav Mehta"
                            className="w-full rounded-[1.2rem] border border-white/10 bg-white/[0.05] py-3.5 pl-11 pr-4 text-sm text-white outline-none transition focus:border-primary/45 focus:bg-white/[0.08] placeholder:text-white/22"
                          />
                        </div>
                      </label>

                      <label className="block">
                        <span className="mb-2 block font-label text-[10px] uppercase tracking-[0.18em] text-white/42">Email</span>
                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                          <input
                            type="email"
                            required
                            value={brochureForm.email}
                            onChange={(event) => updateBrochureForm('email', event.target.value)}
                            placeholder="customer@example.com"
                            className="w-full rounded-[1.2rem] border border-white/10 bg-white/[0.05] py-3.5 pl-11 pr-4 text-sm text-white outline-none transition focus:border-primary/45 focus:bg-white/[0.08] placeholder:text-white/22"
                          />
                        </div>
                      </label>

                      <label className="block">
                        <span className="mb-2 block font-label text-[10px] uppercase tracking-[0.18em] text-white/42">Phone</span>
                        <div className="relative">
                          <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                          <input
                            type="tel"
                            value={brochureForm.phone}
                            onChange={(event) => updateBrochureForm('phone', event.target.value)}
                            placeholder="+91 98XXXXXX42"
                            className="w-full rounded-[1.2rem] border border-white/10 bg-white/[0.05] py-3.5 pl-11 pr-4 text-sm text-white outline-none transition focus:border-primary/45 focus:bg-white/[0.08] placeholder:text-white/22"
                          />
                        </div>
                      </label>

                      <label className="block">
                        <span className="mb-2 block font-label text-[10px] uppercase tracking-[0.18em] text-white/42">Sales Note</span>
                        <div className="relative">
                          <MessageSquareText className="pointer-events-none absolute left-4 top-4 h-4 w-4 text-white/35" />
                          <textarea
                            rows={4}
                            value={brochureForm.note}
                            onChange={(event) => updateBrochureForm('note', event.target.value)}
                            placeholder="Interested in premium cabin accessories and delivery timeline."
                            className="w-full resize-none rounded-[1.2rem] border border-white/10 bg-white/[0.05] py-3.5 pl-11 pr-4 text-sm text-white outline-none transition focus:border-primary/45 focus:bg-white/[0.08] placeholder:text-white/22"
                          />
                        </div>
                      </label>

                      <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.04] p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary/12 text-secondary">
                            <FileText className="h-[18px] w-[18px]" />
                          </div>
                          <div>
                            <p className="font-headline text-sm font-semibold text-white">Demo-ready workflow</p>
                            <p className="mt-1 text-sm leading-6 text-white/58">
                              This generates a polished sample PDF using the selected paint, wheel, and accessories so you can show the managers a complete brochure handoff.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={handleCloseBrochureModal}
                          className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-3.5 font-headline text-sm font-semibold text-white/72 transition-colors hover:bg-white/[0.08]"
                        >
                          Cancel
                        </button>

                        <motion.button
                          whileTap={{ scale: 0.985 }}
                          type="submit"
                          disabled={brochureStatus === 'sending'}
                          className="relative flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-[1.2rem] border border-primary/22 bg-[linear-gradient(135deg,rgba(164,201,255,0.24),rgba(255,255,255,0.08))] px-4 py-3.5 font-headline text-sm font-semibold text-white shadow-[0_16px_40px_rgba(0,0,0,0.28)] disabled:cursor-default disabled:opacity-75"
                        >
                          <span className="absolute inset-0 animate-sheen bg-[linear-gradient(115deg,transparent_20%,rgba(255,255,255,0.18)_48%,transparent_74%)] opacity-70" />
                          <span className="relative flex items-center gap-2">
                            {brochureStatus === 'sending' ? (
                              <span className="h-4 w-4 rounded-full border-2 border-white/25 border-t-white animate-spin" />
                            ) : (
                              <Mail className="h-4 w-4" />
                            )}
                            <span>{brochureStatus === 'sending' ? 'Preparing brochure...' : 'Send brochure'}</span>
                          </span>
                        </motion.button>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
