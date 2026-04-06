import { useEffect, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Mail, MessageSquareText, Phone, UserRound, X } from 'lucide-react';
import { Screen } from '../types';
import { marutiBrochures, type BrochureAsset } from '../data/brochures';

type BrochureForm = {
  name: string;
  email: string;
  phone: string;
  note: string;
};

function buildBrochureMailto(brochure: BrochureAsset, form: BrochureForm) {
  const subject = encodeURIComponent(`${brochure.name} brochure from DILOS`);
  const body = encodeURIComponent(
    [
      `Hi ${form.name || 'there'},`,
      `Sharing the ${brochure.name} brochure from our showroom conversation.`,
      form.phone ? `Phone: ${form.phone}` : '',
      form.note ? `Sales note: ${form.note}` : '',
      'Regards,',
      'DILOS Showroom Team',
    ]
      .filter(Boolean)
      .join('\n\n'),
  );

  return `mailto:${encodeURIComponent(form.email)}?subject=${subject}&body=${body}`;
}

export function BrochuresScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [selectedBrochure, setSelectedBrochure] = useState<BrochureAsset | null>(null);
  const [brochureStatus, setBrochureStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [isClosing, setIsClosing] = useState(false);
  const [lastBrochureLead, setLastBrochureLead] = useState<{ name: string; brochure: string } | null>(null);
  const [brochureForm, setBrochureForm] = useState<BrochureForm>({
    name: '',
    email: '',
    phone: '',
    note: '',
  });

  useEffect(() => {
    if (!selectedBrochure) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedBrochure]);

  const openBrochureModal = (brochure: BrochureAsset) => {
    setSelectedBrochure(brochure);
    setBrochureStatus('idle');
    setIsClosing(false);
  };

  const closeBrochureModal = () => {
    setIsClosing(true);
    window.setTimeout(() => {
      setSelectedBrochure(null);
      setBrochureStatus('idle');
      setBrochureForm({ name: '', email: '', phone: '', note: '' });
      setIsClosing(false);
    }, 400);
  };

  const updateBrochureForm = (field: keyof BrochureForm, value: string) => {
    setBrochureForm((current) => ({ ...current, [field]: value }));
  };

  const handleSendBrochure = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedBrochure) return;

    setBrochureStatus('sending');
    window.location.href = buildBrochureMailto(selectedBrochure, brochureForm);

    window.setTimeout(() => {
      setBrochureStatus('sent');
      setLastBrochureLead({
        name: brochureForm.name,
        brochure: selectedBrochure.name,
      });
    }, 220);

    window.setTimeout(() => {
      closeBrochureModal();
    }, 3600);
  };

  return (
    <>
      <main className="pt-24 pb-32 px-6 max-w-5xl mx-auto space-y-6">
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <span className="font-label text-secondary text-xs uppercase tracking-[0.2em] mb-1 block">Library</span>
              <h1 className="font-headline text-5xl font-bold tracking-tight text-on-surface">Brochures</h1>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('catalog')}
              className="h-12 rounded-xl px-4 glass-panel border border-outline-variant/10 text-primary font-headline font-semibold hover:border-primary/30 transition-all"
            >
              Open Products
            </button>
          </div>

          {lastBrochureLead && (
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2">
              <Mail className="h-3.5 w-3.5 shrink-0 text-secondary" />
              <span className="truncate font-label text-[10px] uppercase tracking-[0.18em] text-white/68">
                Email sent to {lastBrochureLead.name} - {lastBrochureLead.brochure}
              </span>
            </div>
          )}
        </section>

        <section className="space-y-4">
          {marutiBrochures.map((brochure) => (
            <article
              key={brochure.id}
              className="group overflow-hidden rounded-[24pt] border border-outline-variant/10 bg-[linear-gradient(145deg,rgba(31,31,37,0.96),rgba(22,22,28,0.96))] p-4 shadow-[0_22px_44px_rgba(0,0,0,0.24)]"
            >
              <div className="grid gap-4 md:grid-cols-[14rem_1fr_auto] md:items-center">
                <div className="h-36 overflow-hidden rounded-[18pt] bg-surface-container-highest">
                  <img
                    src={brochure.image}
                    alt={brochure.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>

                <div className="min-w-0">
                  <h2 className="font-headline text-2xl font-bold tracking-tight text-on-surface">{brochure.name}</h2>
                  <p className="mt-2 text-sm text-on-surface-variant">{brochure.format}</p>
                </div>

                <div className="flex justify-start md:justify-end">
                  <button
                    type="button"
                    onClick={() => openBrochureModal(brochure)}
                    className="rounded-xl bg-secondary/12 px-4 py-2.5 font-headline text-xs font-bold uppercase tracking-[0.14em] text-secondary hover:bg-secondary/20 transition-colors"
                  >
                    Email
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      </main>

      <AnimatePresence>
        {(selectedBrochure || isClosing) && (
          <>
            <div className="fixed inset-0 z-[100] flex flex-col justify-end">
              <button
                type="button"
                className={`absolute inset-0 h-full w-full cursor-default bg-black/50 backdrop-blur-[2px] transition-opacity duration-[400ms] ease-out ${
                  isClosing ? 'opacity-0' : 'animate-fade-in-backdrop opacity-100'
                }`}
                onClick={closeBrochureModal}
                aria-label="Close"
              />

              <div
                className={`relative z-10 pb-6 md:pb-8 transition-transform duration-[400ms] ease-[cubic-bezier(0.2,0.8,0.4,1)] ${
                  isClosing ? 'translate-y-full' : 'translate-y-0 animate-slide-up-bottom'
                }`}
              >
                <div className="mx-4 mb-3 overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(28,28,34,0.94),rgba(12,12,16,0.96))] backdrop-blur-2xl shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(164,201,255,0.14),transparent_70%)]" />
                  <div className="relative px-5 pb-5 pt-5 sm:px-6 sm:pb-6 sm:pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-label text-[10px] uppercase tracking-[0.24em] text-white/42">Brochure Email</p>
                        <h2 className="mt-2 max-w-[16rem] font-headline text-xl font-bold leading-tight text-white sm:max-w-none sm:text-2xl">
                          Send {selectedBrochure?.name}
                        </h2>
                      </div>

                      <button
                        onClick={closeBrochureModal}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/72 transition-colors hover:bg-white/[0.1]"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-5">
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
                        <h3 className="mt-4 font-headline text-lg font-semibold text-white sm:text-xl">
                          Email sent to {brochureForm.name}
                        </h3>
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
                              rows={3}
                              value={brochureForm.note}
                              onChange={(event) => updateBrochureForm('note', event.target.value)}
                              placeholder="Interested in top variant and finance details."
                              className="w-full resize-none rounded-[1.2rem] border border-white/10 bg-white/[0.05] py-3.5 pl-11 pr-4 text-sm text-white outline-none transition focus:border-primary/45 focus:bg-white/[0.08] placeholder:text-white/22"
                            />
                          </div>
                        </label>

                        <div className="mt-3 border-t border-white/8 pt-4">
                          <motion.button
                            whileTap={{ scale: 0.985 }}
                            type="submit"
                            disabled={brochureStatus === 'sending'}
                            className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-[1.2rem] border border-primary/22 bg-[linear-gradient(135deg,rgba(164,201,255,0.24),rgba(255,255,255,0.08))] px-4 py-3.5 font-headline text-sm font-semibold text-white shadow-[0_16px_40px_rgba(0,0,0,0.28)] disabled:cursor-default disabled:opacity-75"
                          >
                            <span className="absolute inset-0 animate-sheen bg-[linear-gradient(115deg,transparent_20%,rgba(255,255,255,0.18)_48%,transparent_74%)] opacity-70" />
                            <span className="relative flex items-center gap-2">
                              {brochureStatus === 'sending' ? (
                                <span className="h-4 w-4 rounded-full border-2 border-white/25 border-t-white animate-spin" />
                              ) : (
                                <Mail className="h-4 w-4" />
                              )}
                              <span>{brochureStatus === 'sending' ? 'Opening draft...' : 'Email brochure'}</span>
                            </span>
                          </motion.button>
                        </div>
                      </motion.form>
                    )}
                  </AnimatePresence>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
