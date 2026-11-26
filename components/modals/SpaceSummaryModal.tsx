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
import { runAiJob, signatureOf } from "@/lib/ai/client";

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

export type SpaceSummaryState = ReturnType<typeof useSpaceSummary>;

type Props = {
  open: boolean;
  onClose: () => void;
  summary: SpaceSummaryState;
  phases: string[]; // ordered phase labels with cards
  cards: SummaryCardInput[];
  onJumpToPhase: (phase: string) => void;
  onJumpToCard: (id: number) => void;
};

const STORAGE_PREFIX = "spaceSummary:v1:";

const timeAgo = (iso: string) => {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
};

/**
 * Summary fetching, shared by the page header and the modal.
 * With `auto`, it loads in the background once the cards settle.
 */
export function useSpaceSummary({
  layerId,
  category,
  phases,
  cards,
  auto = false,
}: {
  layerId: number;
  category: string;
  phases: string[];
  cards: SummaryCardInput[];
  auto?: boolean;
}) {
  const [data, setData] = useState<SpaceSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inflightKey = useRef<string | null>(null);

  const signature = useMemo(() => signatureOf(cards), [cards]);
  const storageKey = `${STORAGE_PREFIX}${layerId}:${signature}`;

  const load = useCallback(
    async (force = false) => {
      if (cards.length === 0) {
        setError("This space has no cards to summarize yet.");
        return;
      }
      if (!force) {
        // same request already running (e.g. header auto-load): let it finish
        if (inflightKey.current === storageKey) return;
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
      inflightKey.current = storageKey;
      setLoading(true);
      setError(null);
      try {
        const json = await runAiJob<SpaceSummary>(
          "summary",
          { layerId, category, phases, cards, force },
          { signal: ac.signal, fallbackError: "Failed to summarize." },
        );
        setData(json);
        try {
          sessionStorage.setItem(storageKey, JSON.stringify(json));
        } catch {
          /* ignore */
        }
      } catch (e: any) {
        if (e?.name !== "AbortError") setError(e?.message || "Failed to summarize.");
      } finally {
        if (abortRef.current === ac) {
          setLoading(false);
          inflightKey.current = null;
        }
      }
    },
    [cards, category, layerId, phases, storageKey],
  );

  // Background load; debounced so a feed that is still filling in
  // doesn't trigger several requests.
  useEffect(() => {
    if (!auto) return;
    const t = setTimeout(() => load(false), 800);
    return () => clearTimeout(t);
  }, [auto, storageKey]);

  useEffect(() => () => abortRef.current?.abort(), []);

  return { data, loading, error, load, storageKey };
}

export default function SpaceSummaryModal({
  open,
  onClose,
  summary,
  phases,
  cards,
  onJumpToPhase,
  onJumpToCard,
}: Props) {
  const { data, loading, error, load, storageKey } = summary;
  const [minimized, setMinimized] = useState(false);
  const [closing, setClosing] = useState(false);
  // Height of the page's fixed top bar, so the navbar stays sharp and usable.
  const [topOffset, setTopOffset] = useState(64);
  const panelRef = useRef<HTMLDivElement>(null);

  const titleById = useMemo(
    () => new Map(cards.map((c) => [c.id, c.title || `Card #${c.id}`])),
    [cards],
  );

  // Fetch when opened (or when space content changes while open)
  useEffect(() => {
    if (open && !minimized) load(false);
  }, [open, storageKey]);

  useEffect(() => {
    if (!open) {
      setMinimized(false);
      setClosing(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const measure = () => {
      const bars = document.querySelectorAll<HTMLElement>("[data-summary-clear]");
      let bottom = 0;
      bars.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.height > 0) bottom = Math.max(bottom, r.bottom);
      });
      setTopOffset(Math.round(bottom));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
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
        className="mk-btn fixed bottom-6 left-6 z-50 flex items-center gap-2 rounded-[4px] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--mk-ink)]"
        aria-label="Reopen space summary"
      >
        <span className="grid h-6 w-6 place-items-center rounded-[3px] bg-[var(--mk-indigo)] text-white">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <span className="max-w-[180px] truncate">{data?.topic || "Summary"}</span>
        <ArrowUpRight className="h-4 w-4 text-[var(--mk-ink-2)]" />
      </button>
    );
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50"
      style={{ top: topOffset }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-summary-title"
    >
      {/* Soft frosted veil: the collection stays visible, gently out of focus */}
      <div
        className={`absolute inset-0 bg-[var(--mk-ink)]/30 ${closing ? "ai-fade-out" : "ai-fade-in"}`}
        onClick={handleClose}
      />

      {/* Glass panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`mk-hard absolute inset-x-2 bottom-2 top-3 flex flex-col overflow-hidden rounded-[6px] bg-white outline-none md:inset-x-auto md:right-6 md:top-6 md:bottom-6 md:w-[min(620px,calc(100vw-3rem))] ${
          closing ? "ai-panel-out" : "ai-panel-in"
        }`}
      >
        {/* Header */}
        <div className="relative z-10 flex items-start justify-between gap-3 px-5 pt-5 sm:px-7 sm:pt-6">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-[4px] border border-[var(--mk-ink)] bg-[var(--mk-indigo-soft)] text-[var(--mk-indigo)]">
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="leading-tight">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-[var(--mk-ink-2)]">
                Summary
              </div>
              <div className="text-xs text-[var(--mk-ink-2)]">
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
            <div className="rounded-[5px] border border-[var(--mk-ink)] bg-white mt-2 p-5 text-sm text-[var(--mk-ink)]">
              <div className="mb-3 font-medium text-[var(--mk-amber)]">{error}</div>
              <button
                onClick={() => load(true)}
                className="mk-btn rounded-[4px] bg-[var(--mk-ink)] px-4 py-1.5 text-xs font-semibold text-white"
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
                  className="mk-display text-[1.9rem] sm:text-[2.3rem]"
                >
                  {data.topic}
                </h2>
                {data.tagline && (
                  <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--mk-ink)]">
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
              <section className="rounded-[5px] border border-[var(--mk-ink)] bg-white ai-rise p-4 sm:p-5" style={{ animationDelay: "120ms" }}>
                <div className="mb-2 flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-[var(--mk-ink-2)]">
                  <Waves className="h-3.5 w-3.5 text-[var(--mk-indigo)]" />
                  The whole space
                </div>
                <p className="text-[14.5px] leading-relaxed text-[var(--mk-ink)]">{data.overview}</p>
                {data.momentum && (
                  <div className="mt-3 flex items-start gap-2 border-l-2 border-[var(--mk-indigo)] bg-[var(--mk-indigo-soft)] px-3 py-2 text-[13px] text-[var(--mk-ink)]">
                    <Compass className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[var(--mk-indigo)]" />
                    <span>{data.momentum}</span>
                  </div>
                )}
              </section>

              {/* Phase journey */}
              {data.phases.length > 0 && (
                <section>
                  <div
                    className="ai-rise mb-3 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-[var(--mk-ink-2)]"
                    style={{ animationDelay: "180ms" }}
                  >
                    Phase by phase
                  </div>
                  <ol className="relative space-y-3 pl-6">
                    <span className="absolute bottom-3 left-[9px] top-3 w-px bg-[var(--mk-ink)]" />
                    {data.phases.map((p, i) => {
                      const count = cards.filter((c) => c.phase === p.phase).length;
                      return (
                        <li
                          key={p.phase}
                          className="ai-rise relative"
                          style={{ animationDelay: `${220 + i * 70}ms` }}
                        >
                          <span className="absolute -left-6 top-4 h-[18px] w-[18px] rounded-[3px] border border-[var(--mk-ink)] bg-[var(--mk-indigo)]" />
                          <div className="rounded-[5px] border border-[var(--mk-ink)] bg-white group p-4">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex min-w-0 items-baseline gap-2">
                                <h3 className="truncate text-[15px] font-semibold text-[var(--mk-ink)]">
                                  {p.phase}
                                </h3>
                                <span className="flex-shrink-0 text-xs text-[var(--mk-ink-2)]">
                                  {count} {count === 1 ? "card" : "cards"}
                                </span>
                              </div>
                              <button
                                onClick={() => jumpPhase(p.phase)}
                                className="flex flex-shrink-0 items-center gap-1 rounded-[4px] px-2 py-1 text-xs font-semibold text-[var(--mk-indigo)] transition hover:bg-[var(--mk-indigo-soft)] hover:opacity-100"
                              >
                                View <ArrowUpRight className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--mk-ink)]">
                              {p.summary}
                            </p>
                            {p.keyPoints.length > 0 && (
                              <ul className="mt-2 space-y-1">
                                {p.keyPoints.map((k, j) => (
                                  <li
                                    key={j}
                                    className="flex items-start gap-2 text-[13px] text-[var(--mk-ink)]"
                                  >
                                    <span className="mt-[7px] h-1 w-1 flex-shrink-0 bg-[var(--mk-ink-2)]" />
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

              <p className="pt-1 text-center text-[11px] text-[var(--mk-ink-2)]">
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
      <div className="flex items-center gap-2 text-sm text-[var(--mk-ink)]">
        <span className="ai-dots">
          <i />
          <i />
          <i />
        </span>
        Reading {cards} cards across {phases} phases…
      </div>
      <div className="space-y-2">
        <div className="ai-shimmer h-7 w-2/3 rounded-[3px]" />
        <div className="ai-shimmer h-4 w-5/6 rounded-[3px]" />
      </div>
      <div className="rounded-[5px] border border-[var(--mk-ink)] bg-white space-y-2 p-5">
        <div className="ai-shimmer h-3 w-full rounded" />
        <div className="ai-shimmer h-3 w-11/12 rounded" />
        <div className="ai-shimmer h-3 w-4/5 rounded" />
      </div>
      {Array.from({ length: Math.min(Math.max(phases, 2), 4) }).map((_, i) => (
        <div key={i} className="rounded-[5px] border border-[var(--mk-ink)] bg-white ml-6 space-y-2 p-4">
          <div className="ai-shimmer h-4 w-1/3 rounded" />
          <div className="ai-shimmer h-3 w-full rounded" />
          <div className="ai-shimmer h-3 w-3/4 rounded" />
        </div>
      ))}
    </div>
  );
}
