"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles,
  X,
  RefreshCw,
  ArrowUpRight,
  Minimize2,
  Waves,
  Compass,
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

const PHASE_TINTS = [
  "from-violet-400/70 to-fuchsia-400/70",
  "from-sky-400/70 to-cyan-300/70",
  "from-indigo-400/70 to-blue-300/70",
  "from-emerald-400/70 to-teal-300/70",
  "from-amber-300/80 to-orange-300/70",
  "from-pink-400/70 to-rose-300/70",
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

  const jumpPhase = (phase: string) => {
    setMinimized(true);
    onJumpToPhase(phase);
  };
  const jumpCard = (id: number) => {
    setMinimized(true);
    onJumpToCard(id);
  };

  // Minimized: a floating glass pill keeps the summary one tap away.
  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="ai-glass-pill fixed bottom-6 left-6 z-50 flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-slate-800"
        aria-label="Reopen space summary"
      >
        <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 via-blue-500 to-cyan-400 text-white shadow-inner">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <span className="max-w-[180px] truncate">{data?.topic || "Space summary"}</span>
        <ArrowUpRight className="h-4 w-4 text-slate-500" />
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-summary-title"
    >
      {/* Soft frosted veil: the collection stays visible, gently out of focus */}
      <div
        className={`ai-veil absolute inset-0 ${closing ? "ai-fade-out" : "ai-fade-in"}`}
        onClick={handleClose}
      />

      {/* Glass panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`ai-glass-panel absolute inset-x-2 bottom-2 top-16 flex flex-col overflow-hidden rounded-[28px] outline-none md:inset-x-auto md:right-6 md:top-24 md:bottom-6 md:w-[min(620px,calc(100vw-3rem))] ${
          closing ? "ai-panel-out" : "ai-panel-in"
        }`}
      >
        {/* Liquid layer */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="ai-blob ai-blob-a" />
          <div className="ai-blob ai-blob-b" />
          <div className="ai-blob ai-blob-c" />
          <div className="ai-caustics" />
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/50 to-transparent" />
          <div className="ai-sheen" />
        </div>

        {/* Header */}
        <div className="relative z-10 flex items-start justify-between gap-3 px-5 pt-5 sm:px-7 sm:pt-6">
          <div className="flex items-center gap-2.5">
            <span className="ai-orb relative flex h-9 w-9 items-center justify-center rounded-2xl text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="leading-tight">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                Space Summary
              </div>
              <div className="text-xs text-slate-600">
                {data
                  ? `${data.cardCount} cards · ${data.phases.length} phases · ${timeAgo(
                      data.generatedAt,
                    )}`
                  : `${cards.length} cards · ${phases.length} phases`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => load(true)}
              disabled={loading}
              className="ai-icon-btn"
              title="Regenerate"
              aria-label="Regenerate summary"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setMinimized(true)}
              className="ai-icon-btn hidden sm:flex"
              title="Minimize"
              aria-label="Minimize summary"
            >
              <Minimize2 className="h-4 w-4" />
            </button>
            <button
              onClick={handleClose}
              className="ai-icon-btn"
              title="Close"
              aria-label="Close summary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="ai-scroll relative z-10 mt-4 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 sm:px-7">
          {loading && !data && <SummarySkeleton cards={cards.length} phases={phases.length} />}

          {error && !loading && (
            <div className="ai-glass-card mt-2 p-5 text-sm text-slate-700">
              <div className="mb-3 font-medium text-rose-600">{error}</div>
              <button
                onClick={() => load(true)}
                className="rounded-full bg-slate-900/80 px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-900"
              >
                Try again
              </button>
            </div>
          )}

          {data && (
            <div className={`space-y-5 ${loading ? "opacity-60 transition-opacity" : ""}`}>
              {/* Topic */}
              <section className="ai-rise" style={{ animationDelay: "40ms" }}>
                <h2
                  id="ai-summary-title"
                  className="bg-gradient-to-r from-violet-700 via-blue-700 to-cyan-600 bg-clip-text text-2xl font-bold leading-tight text-transparent sm:text-[28px]"
                >
                  {data.topic}
                </h2>
                {data.tagline && (
                  <p className="mt-1.5 text-[15px] leading-relaxed text-slate-700">
                    {data.tagline}
                  </p>
                )}
                {data.themes.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {data.themes.map((t) => (
                      <span key={t} className="ai-chip">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </section>

              {/* Collective summary */}
              <section className="ai-glass-card ai-rise p-4 sm:p-5" style={{ animationDelay: "120ms" }}>
                <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                  <Waves className="h-3.5 w-3.5 text-blue-500" />
                  The whole space
                </div>
                <p className="text-[14.5px] leading-relaxed text-slate-800">{data.overview}</p>
                {data.momentum && (
                  <div className="mt-3 flex items-start gap-2 rounded-2xl bg-white/55 px-3 py-2 text-[13px] text-slate-700 ring-1 ring-white/70">
                    <Compass className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-violet-500" />
                    <span>{data.momentum}</span>
                  </div>
                )}
              </section>

              {/* Phase journey */}
              {data.phases.length > 0 && (
                <section>
                  <div
                    className="ai-rise mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600"
                    style={{ animationDelay: "180ms" }}
                  >
                    Phase by phase
                  </div>
                  <ol className="relative space-y-3 pl-6">
                    <span className="absolute bottom-3 left-[9px] top-3 w-px bg-gradient-to-b from-violet-300/80 via-blue-300/60 to-cyan-300/30" />
                    {data.phases.map((p, i) => {
                      const count = cards.filter((c) => c.phase === p.phase).length;
                      return (
                        <li
                          key={p.phase}
                          className="ai-rise relative"
                          style={{ animationDelay: `${220 + i * 70}ms` }}
                        >
                          <span
                            className={`absolute -left-6 top-4 h-[18px] w-[18px] rounded-full bg-gradient-to-br ${
                              PHASE_TINTS[i % PHASE_TINTS.length]
                            } ring-4 ring-white/50 shadow-[0_0_14px_rgba(139,92,246,.35)]`}
                          />
                          <div className="ai-glass-card group p-4">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex min-w-0 items-baseline gap-2">
                                <h3 className="truncate text-[15px] font-semibold text-slate-900">
                                  {p.phase}
                                </h3>
                                <span className="flex-shrink-0 text-xs text-slate-600">
                                  {count} {count === 1 ? "card" : "cards"}
                                </span>
                              </div>
                              <button
                                onClick={() => jumpPhase(p.phase)}
                                className="flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-blue-700 opacity-80 transition hover:bg-white/60 hover:opacity-100"
                              >
                                View <ArrowUpRight className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-800">
                              {p.summary}
                            </p>
                            {p.keyPoints.length > 0 && (
                              <ul className="mt-2 space-y-1">
                                {p.keyPoints.map((k, j) => (
                                  <li
                                    key={j}
                                    className="flex items-start gap-2 text-[13px] text-slate-700"
                                  >
                                    <span className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full bg-slate-400" />
                                    <span>{k}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                            {p.keyCardIds.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-1.5">
                                {p.keyCardIds.map((id) => (
                                  <button
                                    key={id}
                                    onClick={() => jumpCard(id)}
                                    className="ai-card-link"
                                    title="Show this card in the collection"
                                  >
                                    <CornerDownRight className="h-3 w-3 flex-shrink-0 opacity-60" />
                                    <span className="truncate">{titleById.get(id)}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              )}

              <p className="pt-1 text-center text-[11px] text-slate-600">
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
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-slate-700">
        <span className="ai-dots">
          <i />
          <i />
          <i />
        </span>
        Reading {cards} cards across {phases} phases…
      </div>
      <div className="space-y-2">
        <div className="ai-shimmer h-7 w-2/3 rounded-xl" />
        <div className="ai-shimmer h-4 w-5/6 rounded-lg" />
      </div>
      <div className="ai-glass-card space-y-2 p-5">
        <div className="ai-shimmer h-3 w-full rounded" />
        <div className="ai-shimmer h-3 w-11/12 rounded" />
        <div className="ai-shimmer h-3 w-4/5 rounded" />
      </div>
      {Array.from({ length: Math.min(Math.max(phases, 2), 4) }).map((_, i) => (
        <div key={i} className="ai-glass-card ml-6 space-y-2 p-4">
          <div className="ai-shimmer h-4 w-1/3 rounded" />
          <div className="ai-shimmer h-3 w-full rounded" />
          <div className="ai-shimmer h-3 w-3/4 rounded" />
        </div>
      ))}
    </div>
  );
}
