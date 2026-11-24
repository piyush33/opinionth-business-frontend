"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  Sparkles,
  X,
  RefreshCw,
  ArrowUpRight,
  Minimize2,
  Compass,
  ChevronRight,
  CornerDownRight,
} from "lucide-react";

export type SummaryCardInput = {
  id: number;
  title?: string;
  description?: string;
  text?: string;
  username?: string;
  category?: string;
  phase: string; // phase group label
  roleTypes?: string[];
  createdAt?: string;
  weblink?: string;
};

type PhaseSummary = {
  phase: string;
  summary: string;
  keyPoints: string[];
  keyCardIds: number[];
};

type SpaceSummary = {
  topic: string;
  tagline: string;
  overview: string;
  themes: string[];
  momentum: string;
  phases: PhaseSummary[];
  generatedAt: string;
  cardCount: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  layerId: number;
  category: string;
  phases: string[]; // ordered phase labels with cards
  cards: SummaryCardInput[];
  onJumpToPhase: (phase: string) => void;
  onJumpToCard: (id: number) => void;
};

const STORAGE_PREFIX = "spaceSummary:v1:";

const signatureOf = (cards: SummaryCardInput[]) => {
  // cheap content signature: ids + phase + title length
  let h = 0;
  const s = cards
    .map((c) => `${c.id}|${c.phase}|${(c.title ?? "").length}|${(c.text ?? "").length}`)
    .sort()
    .join(",");
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return `${cards.length}-${Math.abs(h)}`;
};

const timeAgo = (iso: string) => {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
};

// Apple system colours (light appearance) for phase markers
const PHASE_DOTS = [
  "#AF52DE", // purple
  "#007AFF", // blue
  "#5856D6", // indigo
  "#34C759", // green
  "#FF9500", // orange
  "#FF2D55", // pink
  "#30B0C7", // teal
];

export default function SpaceSummaryModal({
  open,
  onClose,
  layerId,
  category,
  phases,
  cards,
  onJumpToPhase,
  onJumpToCard,
}: Props) {
  const [data, setData] = useState<SpaceSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [closing, setClosing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const signature = useMemo(() => signatureOf(cards), [cards]);
  const storageKey = `${STORAGE_PREFIX}${layerId}:${signature}`;
  const titleById = useMemo(
    () => new Map(cards.map((c) => [c.id, c.title || `Card #${c.id}`])),
    [cards],
  );

  const load = useCallback(
    async (force = false) => {
      if (cards.length === 0) {
        setError("This space has no cards to summarize yet.");
        return;
      }
      if (!force) {
        try {
          const cached = sessionStorage.getItem(storageKey);
          if (cached) {
            setData(JSON.parse(cached));
            setError(null);
            return;
          }
        } catch {
          /* ignore storage errors */
        }
      }
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/ai/space-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ layerId, category, phases, cards, force }),
          signal: ac.signal,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to summarize.");
        setData(json);
        try {
          sessionStorage.setItem(storageKey, JSON.stringify(json));
        } catch {
          /* ignore */
        }
      } catch (e: any) {
        if (e?.name !== "AbortError") setError(e?.message || "Failed to summarize.");
      } finally {
        if (abortRef.current === ac) setLoading(false);
      }
    },
    [cards, category, layerId, phases, storageKey],
  );

  // Fetch when opened (or when space content changes while open)
  useEffect(() => {
    if (open && !minimized) load(false);
  }, [open, storageKey]);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    if (!open) {
      setMinimized(false);
      setClosing(false);
    }
  }, [open]);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 220);
  }, [onClose]);

  useEffect(() => {
    if (!open || minimized) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, minimized, handleClose]);

  if (!open) return null;

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = panelRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
  };

  const jumpPhase = (phase: string) => {
    setMinimized(true);
    onJumpToPhase(phase);
  };
  const jumpCard = (id: number) => {
    setMinimized(true);
    onJumpToCard(id);
  };

  // Minimized: a floating glass capsule keeps the summary one tap away.
  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="lg-type lg-capsule fixed bottom-6 left-6 z-50 flex items-center gap-2 rounded-full py-2 pl-2 pr-3.5 text-[14px] font-medium"
        aria-label="Reopen space summary"
      >
        <span className="lg-rim" />
        <span className="lg-icon flex h-7 w-7 items-center justify-center rounded-full">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <span className="max-w-[200px] truncate text-[color:var(--lg-label)]">
          {data?.topic || "Space Summary"}
        </span>
        <ArrowUpRight className="h-4 w-4 text-[color:var(--lg-tertiary)]" />
      </button>
    );
  }

  return (
    <div
      className="lg-type fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="space-summary-title"
    >
      {/* Light veil: the collection stays sharp and visible behind */}
      <div
        className={`lg-veil absolute inset-0 ${closing ? "lg-fade-out" : "lg-fade-in"}`}
        onClick={handleClose}
      />

      {/* Liquid glass panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        onPointerMove={onPointerMove}
        className={`lg-panel absolute inset-x-2 bottom-2 top-16 flex flex-col overflow-hidden rounded-[32px] outline-none md:inset-x-auto md:right-6 md:top-24 md:bottom-6 md:w-[min(600px,calc(100vw-3rem))] ${
          closing ? "lg-panel-out" : "lg-panel-in"
        }`}
      >
        <span className="lg-specular" aria-hidden />
        <span className="lg-rim" aria-hidden />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between gap-3 px-5 pt-5 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="lg-icon flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full">
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="min-w-0 leading-tight">
              <div className="text-[15px] font-semibold text-[color:var(--lg-label)]">
                Space Summary
              </div>
              <div className="truncate text-[12.5px] text-[color:var(--lg-secondary)]">
                {data
                  ? `${data.cardCount} cards · ${data.phases.length} phases · Updated ${timeAgo(
                      data.generatedAt,
                    )}`
                  : `${cards.length} cards · ${phases.length} phases`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => load(true)}
              disabled={loading}
              className="lg-btn"
              title="Regenerate"
              aria-label="Regenerate summary"
            >
              <RefreshCw className={`h-[15px] w-[15px] ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setMinimized(true)}
              className="lg-btn hidden sm:flex"
              title="Minimize"
              aria-label="Minimize summary"
            >
              <Minimize2 className="h-[15px] w-[15px]" />
            </button>
            <button
              onClick={handleClose}
              className="lg-btn"
              title="Close"
              aria-label="Close summary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="lg-scroll relative z-10 mt-5 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 sm:px-6">
          {loading && !data && <SummarySkeleton cards={cards.length} phases={phases.length} />}

          {error && !loading && (
            <div className="lg-platter p-5">
              <div className="mb-3 text-[14px] font-medium text-[#D70015]">{error}</div>
              <button onClick={() => load(true)} className="lg-btn-text">
                Try Again
              </button>
            </div>
          )}

          {data && (
            <div className={`space-y-6 ${loading ? "opacity-60 transition-opacity" : ""}`}>
              {/* Topic */}
              <section className="lg-rise px-1" style={{ animationDelay: "60ms" }}>
                <h2
                  id="space-summary-title"
                  className="text-[26px] font-bold leading-[1.15] tracking-[-0.022em] text-[color:var(--lg-label)] sm:text-[30px]"
                >
                  {data.topic}
                </h2>
                {data.tagline && (
                  <p className="mt-2 text-[15px] leading-[1.45] text-[color:var(--lg-secondary)]">
                    {data.tagline}
                  </p>
                )}
                {data.themes.length > 0 && (
                  <div className="mt-3.5 flex flex-wrap gap-1.5">
                    {data.themes.map((t) => (
                      <span key={t} className="lg-chip">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </section>

              {/* Collective summary */}
              <section className="lg-rise" style={{ animationDelay: "130ms" }}>
                <h3 className="lg-section-title">Overview</h3>
                <div className="lg-platter">
                  <p className="px-4 py-3.5 text-[15px] leading-[1.5] text-[color:var(--lg-label)]">
                    {data.overview}
                  </p>
                  {data.momentum && (
                    <div className="lg-hairline-top flex items-start gap-2.5 px-4 py-3 text-[14px] leading-[1.45] text-[color:var(--lg-secondary)]">
                      <Compass className="mt-[2px] h-4 w-4 flex-shrink-0 text-[#AF52DE]" />
                      <span>{data.momentum}</span>
                    </div>
                  )}
                </div>
              </section>

              {/* Phase by phase */}
              {data.phases.length > 0 && (
                <section className="lg-rise" style={{ animationDelay: "190ms" }}>
                  <h3 className="lg-section-title">Phases</h3>
                  <ol className="lg-platter">
                    {data.phases.map((p, i) => {
                      const count = cards.filter((c) => c.phase === p.phase).length;
                      return (
                        <li
                          key={p.phase}
                          className={`lg-rise px-4 py-3.5 ${i > 0 ? "lg-hairline-top" : ""}`}
                          style={{ animationDelay: `${230 + i * 60}ms` }}
                        >
                          <button
                            onClick={() => jumpPhase(p.phase)}
                            className="group flex w-full items-center gap-2.5 text-left"
                            title="Show this phase in the collection"
                          >
                            <span
                              className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                              style={{
                                background: PHASE_DOTS[i % PHASE_DOTS.length],
                                boxShadow: `0 0 0 3px ${PHASE_DOTS[i % PHASE_DOTS.length]}22`,
                              }}
                            />
                            <span className="min-w-0 flex-1 truncate text-[16px] font-semibold tracking-[-0.01em] text-[color:var(--lg-label)]">
                              {p.phase}
                            </span>
                            <span className="flex-shrink-0 text-[13px] text-[color:var(--lg-tertiary)]">
                              {count} {count === 1 ? "card" : "cards"}
                            </span>
                            <ChevronRight className="h-4 w-4 flex-shrink-0 text-[color:var(--lg-tertiary)] transition-transform group-hover:translate-x-0.5" />
                          </button>
                          <p className="mt-1.5 pl-5 text-[14px] leading-[1.5] text-[color:var(--lg-label)]">
                            {p.summary}
                          </p>
                          {p.keyPoints.length > 0 && (
                            <ul className="mt-2 space-y-1 pl-5">
                              {p.keyPoints.map((k, j) => (
                                <li
                                  key={j}
                                  className="flex items-start gap-2 text-[13.5px] leading-[1.45] text-[color:var(--lg-secondary)]"
                                >
                                  <span className="mt-[8px] h-[4px] w-[4px] flex-shrink-0 rounded-full bg-[color:var(--lg-tertiary)]" />
                                  <span>{k}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                          {p.keyCardIds.length > 0 && (
                            <div className="mt-2.5 flex flex-wrap gap-1.5 pl-5">
                              {p.keyCardIds.map((id) => (
                                <button
                                  key={id}
                                  onClick={() => jumpCard(id)}
                                  className="lg-link"
                                  title="Select this card in the collection"
                                >
                                  <CornerDownRight className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{titleById.get(id)}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </section>
              )}

              <p className="px-1 text-center text-[12px] text-[color:var(--lg-tertiary)]">
                Auto-generated from the cards you can see. It can be wrong; check the cards.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummarySkeleton({ cards, phases }: { cards: number; phases: number }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 px-1 text-[14px] text-[color:var(--lg-secondary)]">
        <span className="lg-dots">
          <i />
          <i />
          <i />
        </span>
        Reading {cards} cards across {phases} phases…
      </div>
      <div className="space-y-2.5 px-1">
        <div className="lg-shimmer h-7 w-2/3 rounded-lg" />
        <div className="lg-shimmer h-4 w-5/6 rounded-md" />
      </div>
      <div className="lg-platter space-y-2.5 p-4">
        <div className="lg-shimmer h-3.5 w-full rounded" />
        <div className="lg-shimmer h-3.5 w-11/12 rounded" />
        <div className="lg-shimmer h-3.5 w-4/5 rounded" />
      </div>
      <div className="lg-platter">
        {Array.from({ length: Math.min(Math.max(phases, 2), 4) }).map((_, i) => (
          <div key={i} className={`space-y-2.5 p-4 ${i > 0 ? "lg-hairline-top" : ""}`}>
            <div className="lg-shimmer h-4 w-1/3 rounded" />
            <div className="lg-shimmer h-3.5 w-full rounded" />
            <div className="lg-shimmer h-3.5 w-3/4 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
