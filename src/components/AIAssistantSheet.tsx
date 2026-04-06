import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  buildAssistantBlueprint,
  buildAssistantReply,
  type AssistantContextSnapshot,
  type AssistantPrompt,
} from '../lib/assistantCoach';
import {
  getCustomerThread,
  listCoachReports,
  readRememberedReportId,
  readRememberedSessionId,
  readRememberedThreadId,
} from '../lib/myCoachApi';
import type { Screen } from '../types';

type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
};

export function AIAssistantSheet({
  isOpen,
  onClose,
  currentScreen,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentScreen: Screen;
}) {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [snapshot, setSnapshot] = useState<AssistantContextSnapshot>({
    screen: currentScreen,
    thread: null,
    reportItem: null,
  });
  const [loadingContext, setLoadingContext] = useState(false);
  const [pendingReplyIds, setPendingReplyIds] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const replyTimeoutsRef = useRef<number[]>([]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    return () => {
      replyTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      replyTimeoutsRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    clearQueuedReplies();
    setLoadingContext(true);

    void loadAssistantContext(currentScreen)
      .then((nextSnapshot) => {
        if (cancelled) return;
        setSnapshot(nextSnapshot);
        const blueprint = buildAssistantBlueprint(nextSnapshot);
        setMessages([
          {
            id: makeMessageId(),
            role: 'assistant',
            text: blueprint.intro,
          },
        ]);
        setPendingReplyIds([]);
        setQuery('');
      })
      .catch(() => {
        if (cancelled) return;
        const fallbackSnapshot: AssistantContextSnapshot = { screen: currentScreen, thread: null, reportItem: null };
        setSnapshot(fallbackSnapshot);
        setMessages([
          {
            id: makeMessageId(),
            role: 'assistant',
            text: buildAssistantBlueprint(fallbackSnapshot).intro,
          },
        ]);
        setPendingReplyIds([]);
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingContext(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentScreen, isOpen, refreshKey]);

  useEffect(() => {
    if (!isOpen) return;

    bottomRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });
  }, [isOpen, loadingContext, messages]);

  const blueprint = buildAssistantBlueprint(snapshot);

  function sendPrompt(prompt: AssistantPrompt) {
    setMessages((current) => [...current, { id: makeMessageId(), role: 'user', text: prompt.label }]);
    queueAssistantReply(prompt.response);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    const reply = buildAssistantReply(trimmed, snapshot);
    setMessages((current) => [...current, { id: makeMessageId(), role: 'user', text: trimmed }]);
    queueAssistantReply(reply);
    setQuery('');
  }

  function queueAssistantReply(reply: string) {
    const pendingId = makeMessageId();
    setPendingReplyIds((current) => [...current, pendingId]);

    const timeoutId = window.setTimeout(() => {
      setPendingReplyIds((current) => current.filter((item) => item !== pendingId));
      setMessages((current) => [...current, { id: makeMessageId(), role: 'assistant', text: reply }]);
      replyTimeoutsRef.current = replyTimeoutsRef.current.filter((item) => item !== timeoutId);
    }, 650);

    replyTimeoutsRef.current.push(timeoutId);
  }

  function clearQueuedReplies() {
    replyTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    replyTimeoutsRef.current = [];
    setPendingReplyIds([]);
  }

  return (
    <AnimatePresence>
      {isOpen ? (
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
            onDragEnd={(_event, info) => {
              if (info.offset.y > 150 || info.velocity.y > 500) {
                onClose();
              }
            }}
            className="fixed bottom-0 left-0 right-0 z-[70] flex h-[85vh] flex-col rounded-t-[2.5rem] border-t border-white/10 bg-surface-container shadow-[0_-20px_40px_rgba(0,0,0,0.5)]"
          >
            <div className="flex w-full justify-center pb-2 pt-4">
              <div className="h-1.5 w-12 rounded-full bg-outline-variant/50"></div>
            </div>

            <div className="border-b border-white/5 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/20 text-secondary">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                    auto_awesome
                  </span>
                </div>
                <div>
                  <h2 className="font-headline text-lg font-bold text-on-surface">DILOS Intelligence</h2>
                  <p className="font-label text-xs uppercase tracking-widest text-secondary">Sales Coach</p>
                </div>
              </div>
            </div>

            <div className="hide-scrollbar flex-1 space-y-4 overflow-y-auto p-6">
              {loadingContext ? (
                <div className="self-start max-w-[88%]">
                  <div className="rounded-2xl rounded-tl-sm border border-outline-variant/10 bg-surface-container-high p-4">
                    <p className="font-body text-sm text-on-surface">Refreshing screen context and coaching priorities...</p>
                  </div>
                </div>
              ) : null}

              <AnimatePresence initial={false}>
                {messages.map((message) => (
                  <MessageBubble key={message.id} role={message.role} text={message.text} />
                ))}
                {pendingReplyIds.map((replyId) => (
                  <ThinkingBubble key={replyId} />
                ))}
              </AnimatePresence>

              <div ref={bottomRef} />
            </div>

            <div className="border-t border-white/5 bg-surface-container/80 p-4 pb-safe backdrop-blur-md">
              <div className="space-y-3">
                <PromptLane
                  title={blueprint.discoveryTitle}
                  prompts={blueprint.discoveryPrompts}
                  tone="discovery"
                  onSelect={sendPrompt}
                />
                <PromptLane
                  title={blueprint.objectionTitle}
                  prompts={blueprint.objectionPrompts}
                  tone="objection"
                  onSelect={sendPrompt}
                />
              </div>

              <form onSubmit={handleSubmit} className="relative mt-4 flex items-center">
                <button
                  type="button"
                  onClick={() => setRefreshKey((current) => current + 1)}
                  className="absolute left-3 flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:text-on-surface"
                  aria-label="Refresh assistant context"
                >
                  <span className="material-symbols-outlined">refresh</span>
                </button>
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Ask about the next question, objection, or follow-up..."
                  className="w-full rounded-full border border-outline-variant/20 bg-surface-container-highest py-3 pl-12 pr-12 font-body text-sm text-on-surface placeholder:text-outline/50 transition-all focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
                <button
                  type="submit"
                  disabled={!query.trim()}
                  className={`absolute right-2 flex h-8 w-8 items-center justify-center rounded-full transition-all ${
                    query.trim() ? 'bg-primary text-on-primary-fixed' : 'bg-transparent text-outline'
                  }`}
                  aria-label="Send message"
                >
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    arrow_upward
                  </span>
                </button>
              </form>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function MessageBubble({ role, text }: { role: ChatMessage['role']; text: string }) {
  const isUser = role === 'user';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[88%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`rounded-2xl p-4 ${
            isUser
              ? 'rounded-tr-sm bg-primary text-on-primary-fixed'
              : 'rounded-tl-sm border border-outline-variant/10 bg-surface-container-high text-on-surface'
          }`}
        >
          <p className="font-body text-sm leading-6">{text}</p>
        </div>
      </div>
    </motion.div>
  );
}

function ThinkingBubble() {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
      className="flex justify-start"
    >
      <div className="max-w-[88%]">
        <div className="rounded-2xl rounded-tl-sm border border-outline-variant/10 bg-surface-container-high p-4 text-on-surface">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-[0.16em] text-on-surface-variant">Thinking</span>
            <div className="flex items-center gap-1">
              {[0, 1, 2].map((item) => (
                <motion.span
                  key={item}
                  className="h-1.5 w-1.5 rounded-full bg-secondary"
                  animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay: item * 0.12, ease: 'easeInOut' }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function PromptLane({
  title,
  prompts,
  tone,
  onSelect,
}: {
  title: string;
  prompts: AssistantPrompt[];
  tone: 'discovery' | 'objection';
  onSelect: (prompt: AssistantPrompt) => void;
}) {
  const toneClasses =
    tone === 'discovery'
      ? 'border-primary/30 text-primary hover:bg-primary/10'
      : 'border-secondary/30 text-secondary hover:bg-secondary/10';

  return (
    <div>
      <p className="mb-2 px-1 font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">{title}</p>
      <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1">
        {prompts.map((prompt) => (
          <button
            key={prompt.id}
            type="button"
            onClick={() => onSelect(prompt)}
            className={`whitespace-nowrap rounded-full border px-4 py-2 text-left font-body text-xs transition-colors ${toneClasses}`}
          >
            {prompt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

async function loadAssistantContext(screen: Screen): Promise<AssistantContextSnapshot> {
  const rememberedThreadId = readRememberedThreadId();
  const rememberedReportId = readRememberedReportId();
  const rememberedSessionId = readRememberedSessionId();

  const [reports, rememberedThread] = await Promise.all([
    listCoachReports().catch(() => []),
    rememberedThreadId ? getCustomerThread(rememberedThreadId).catch(() => null) : Promise.resolve(null),
  ]);

  const reportItem =
    reports.find((item) => item.id === rememberedReportId) ||
    reports.find((item) => item.sessionId === rememberedSessionId) ||
    reports.find((item) => item.customerId === rememberedThreadId) ||
    reports[0] ||
    null;

  const thread =
    rememberedThread ||
    (reportItem?.customerId ? await getCustomerThread(reportItem.customerId).catch(() => null) : null);

  return {
    screen,
    thread,
    reportItem,
  };
}

function makeMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
