"use client";

// Hovering a card (desktop) shows an AI-suggested next card for that
// card's phase, floating beside it. Cards opt in with `data-suggest-id`.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Sparkles, X, Shuffle, Compass, PenLine, Tag } from "lucide-react";
import { getRoleTypeById } from "@/lib/phases";
import { runAiJob, signatureOf } from "@/lib/ai/client";
import { withCardRefs } from "@/components/ai/cardRefs";
import type { SummaryCardInput } from "@/components/modals/SpaceSummaryModal";

export type CardSuggestion = {
  title: string;
  description: string;
  text: string;
  roleTypes: string[];
  rationale: string;
  relatedCardIds: number[];
};

type Suggestions = {
  phases: { phase: string; suggestions: CardSuggestion[] }[];
  generatedAt: string;
  cardCount: number;
};

type Props = {
  layerId: number;
  category: string;
  phases: string[];
  cards: SummaryCardInput[];
  disabled?: boolean;
  onDraft: (cardId: number, suggestion: CardSuggestion) => void;
};

export const SUGGEST_MIN_CARDS = 3;
// v2: suggestions reference cards as @id and use phase/role voice.
const STORAGE_PREFIX = "cardSuggest:v2:";
// Width follows the hovered card, within these bounds.
const MIN_W = 300;
const MAX_W = 400;
const GAP = 12;
// Generation starts as soon as a card is hovered; the suggestion is only
// revealed after this long on the same card, so passing over cards never
// pops anything up.
const REVEAL_DELAY = 10_000;
const HIDE_DELAY = 300;

const scrollToCard = (id: number) =>
  document.getElementById(`card-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
const refs = (text: string) => withCardRefs(text, scrollToCard);

function useCardSuggestions({
  layerId,
  category,
  phases,
  cards,
}: Omit<Props, "disabled" | "onDraft">) {
  const [data, setData] = useState<Suggestions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inflight = useRef<string | null>(null);
  const loadedKey = useRef<string | null>(null);

  const storageKey = `${STORAGE_PREFIX}${layerId}:${useMemo(() => signatureOf(cards), [cards])}`;

  // Cards changed: the old suggestions no longer match.
  useEffect(() => {
    if (loadedKey.current && loadedKey.current !== storageKey) {
      setData(null);
      setError(null);
      loadedKey.current = null;
    }
  }, [storageKey]);

  const ensure = useCallback(
    async (force = false) => {
      if (!force && (loadedKey.current === storageKey || inflight.current === storageKey)) return;
      if (cards.length < SUGGEST_MIN_CARDS) return;
      if (!force) {
        try {
          const cached = sessionStorage.getItem(storageKey);
          if (cached) {
            setData(JSON.parse(cached));
            setError(null);
            loadedKey.current = storageKey;
            return;
          }
        } catch {
          /* ignore */
        }
      }
      inflight.current = storageKey;
      setLoading(true);
      setError(null);
      try {
        const json = await runAiJob<Suggestions>(
          "suggestions",
          { layerId, category, phases, cards, force },
          { fallbackError: "Could not get suggestions." },
        );
        if (inflight.current !== storageKey) return; // cards changed meanwhile
        setData(json);
        loadedKey.current = storageKey;
        try {
          sessionStorage.setItem(storageKey, JSON.stringify(json));
        } catch {
          /* ignore */
        }
      } catch (e: any) {
        if (inflight.current === storageKey) setError(e?.message || "Could not get suggestions.");
      } finally {
        if (inflight.current === storageKey) {
          inflight.current = null;
          setLoading(false);
        }
      }
    },
    [cards, category, layerId, phases, storageKey],
  );

  return { data, loading, error, ensure };
}

export default function CardSuggestionHover({
  layerId,
  category,
  phases,
  cards,
  disabled,
  onDraft,
}: Props) {
  const { data, loading, error, ensure } = useCardSuggestions({
    layerId,
    category,
    phases,
    cards,
  });
  const [anchorId, setAnchorId] = useState<number | null>(null);
  const [pick, setPick] = useState(0);
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    width: number;
    maxH: number;
  } | null>(null);
  const [canHover, setCanHover] = useState(false);
  const anchorRef = useRef<number | null>(null);
  const dwellRef = useRef<number | null>(null); // card being hovered, not yet revealed
  const showT = useRef<number | undefined>(undefined);
  const hideT = useRef<number | undefined>(undefined);
  const popRef = useRef<HTMLDivElement>(null);

  const cardById = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const active = !disabled && canHover && cards.length >= SUGGEST_MIN_CARDS;

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setCanHover(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Close the open suggestion only (a hover on another card may be counting).
  const closePopover = useCallback(() => {
    window.clearTimeout(hideT.current);
    anchorRef.current = null;
    setAnchorId(null);
    setPos(null);
  }, []);

  // Close and cancel everything.
  const hide = useCallback(() => {
    window.clearTimeout(showT.current);
    dwellRef.current = null;
    closePopover();
  }, [closePopover]);

  // Hover tracking via delegation, so the page only tags its cards.
  useEffect(() => {
    if (!active) {
      hide();
      return;
    }
    const onOver = (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== "mouse") return;
      const t = e.target as Element | null;
      if (!t?.closest) return;
      if (t.closest("[data-suggest-popover]")) {
        // Back on the open suggestion: keep it, and stop counting any card
        // the pointer crossed on the way.
        window.clearTimeout(hideT.current);
        window.clearTimeout(showT.current);
        dwellRef.current = null;
        return;
      }
      const el = t.closest<HTMLElement>("[data-suggest-id]");
      if (el) {
        const id = Number(el.dataset.suggestId);
        if (id === anchorRef.current) {
          window.clearTimeout(hideT.current);
          window.clearTimeout(showT.current);
          dwellRef.current = null;
          return;
        }
        if (!cardById.has(id) || id === dwellRef.current) return;
        // A new card: drop any open suggestion, start generating now, and
        // reveal only if the pointer stays on this card for REVEAL_DELAY.
        if (anchorRef.current != null) {
          window.clearTimeout(hideT.current);
          hideT.current = window.setTimeout(closePopover, HIDE_DELAY);
        }
        window.clearTimeout(showT.current);
        dwellRef.current = id;
        ensure();
        showT.current = window.setTimeout(() => {
          if (dwellRef.current !== id) return;
          dwellRef.current = null;
          window.clearTimeout(hideT.current);
          anchorRef.current = id;
          setAnchorId(id);
          setPick(0);
        }, REVEAL_DELAY);
      } else {
        window.clearTimeout(showT.current);
        dwellRef.current = null;
        if (anchorRef.current != null) {
          window.clearTimeout(hideT.current);
          hideT.current = window.setTimeout(closePopover, HIDE_DELAY);
        }
      }
    };
    // Clicking the card itself means the user is busy with it.
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (t?.closest?.("[data-suggest-popover]")) return;
      hide();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide();
    };
    // Pointer left the window (or the tab lost focus): stop counting.
    const onLeave = () => {
      window.clearTimeout(showT.current);
      dwellRef.current = null;
    };
    document.addEventListener("pointerover", onOver);
    document.addEventListener("pointerdown", onDown, true);
    window.addEventListener("keydown", onKey);
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);
    return () => {
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(showT.current);
      window.clearTimeout(hideT.current);
    };
  }, [active, cardById, ensure, hide, closePopover]);

  // Keep the popover beside its card while scrolling or resizing.
  const place = useCallback(() => {
    if (anchorRef.current == null) return;
    const el = document.querySelector<HTMLElement>(`[data-suggest-id="${anchorRef.current}"]`);
    if (!el) return hide();
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let navBottom = 0;
    document.querySelectorAll<HTMLElement>("[data-summary-clear]").forEach((b) => {
      const br = b.getBoundingClientRect();
      if (br.height > 0) navBottom = Math.max(navBottom, br.bottom);
    });
    if (r.bottom < navBottom + 24 || r.top > vh - 24) return hide();

    const width = Math.round(Math.min(Math.max(r.width, MIN_W), MAX_W, vw - 16));
    const maxH = Math.max(200, vh - navBottom - 16);
    const h = Math.min(popRef.current?.offsetHeight ?? 320, maxH);
    let left: number;
    let top: number;
    if (r.right + GAP + width <= vw - 8) {
      left = r.right + GAP;
      top = r.top;
    } else if (r.left - GAP - width >= 8) {
      left = r.left - GAP - width;
      top = r.top;
    } else {
      left = Math.min(Math.max(r.left, 8), vw - width - 8);
      top = r.bottom + GAP;
    }
    top = Math.min(Math.max(top, navBottom + 8), vh - h - 8);
    setPos({ top: Math.round(top), left: Math.round(left), width, maxH });
  }, [hide]);

  useLayoutEffect(() => {
    if (anchorId == null) return;
    place();
  }, [anchorId, data, loading, error, pick, place]);

  useEffect(() => {
    if (anchorId == null) return;
    let raf = 0;
    const onMove = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(place);
    };
    window.addEventListener("scroll", onMove, { passive: true, capture: true });
    window.addEventListener("resize", onMove);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onMove, { capture: true });
      window.removeEventListener("resize", onMove);
    };
  }, [anchorId, place]);

  if (anchorId == null || typeof document === "undefined") return null;
  const card = cardById.get(anchorId);
  if (!card) return null;

  const list = data?.phases.find((p) => p.phase === card.phase)?.suggestions ?? [];
  // Prefer the suggestion that builds on the hovered card.
  const related = list.findIndex((s) => s.relatedCardIds.includes(anchorId));
  const base = related >= 0 ? related : anchorId % Math.max(list.length, 1);
  const s = list.length ? list[(base + pick) % list.length] : null;

  const roles = (s?.roleTypes ?? []).map(
    (id) => getRoleTypeById(id) ?? { id, name: id, description: "" },
  );

  // Mirrors components/card.tsx (header, role chips, body, title and
  // description, action row) on a solid background, so it reads cleanly
  // over whatever card it overlaps.
  return createPortal(
    <div
      ref={popRef}
      data-suggest-popover
      role="dialog"
      aria-label={`Suggested card for ${card.phase}`}
      className="ai-rise fixed z-40"
      style={{
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        width: pos?.width ?? MIN_W,
        visibility: pos ? "visible" : "hidden",
      }}
    >
      <div
        className="relative flex flex-col overflow-hidden mk-hard rounded-[6px] bg-white"
        style={{ maxHeight: pos?.maxH }}
      >
        {/* Header, like the card's author row */}
        <div className="flex shrink-0 items-center gap-3 p-4 pb-2">
          {/* Plain tile, like the Explore section and category icons */}
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[4px] border border-[var(--mk-ink)] bg-[var(--mk-indigo-soft)]">
            <Sparkles className="h-4 w-4 text-[var(--mk-indigo)]" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-[var(--mk-ink)]">
                Suggested next card
              </span>
              <span className="shrink-0 rounded-[3px] border border-[var(--mk-indigo)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-[var(--mk-indigo)]">
                AI
              </span>
            </div>
            <div className="truncate text-xs text-[var(--mk-ink-2)]">{card.phase}</div>
          </div>
          <button
            type="button"
            onClick={hide}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-[4px] border border-[var(--mk-ink)] hover:bg-[var(--mk-indigo-soft)]"
            aria-label="Hide suggestion"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {!s && (loading || (!data && !error)) && (
            <div className="space-y-2.5 px-4 pb-4 pt-2" aria-live="polite">
              <div className="ai-shimmer h-3 w-full rounded-[3px]" />
              <div className="ai-shimmer h-3 w-11/12 rounded-[3px]" />
              <div className="ai-shimmer h-3 w-3/4 rounded-[3px]" />
              <div className="ai-shimmer mt-3 h-5 w-2/3 rounded-[3px]" />
              <div className="flex items-center gap-2 pt-1 text-xs text-[var(--mk-ink-2)]">
                <span className="ai-dots">
                  <i />
                  <i />
                  <i />
                </span>
                Reading the space…
              </div>
            </div>
          )}

          {!s && error && !loading && (
            <div className="px-4 pb-4 pt-2 text-sm">
              <div className="mb-2 font-medium text-[var(--mk-amber)]">{error}</div>
              <button
                type="button"
                onClick={() => ensure(true)}
                className="mk-btn rounded-[4px] bg-[var(--mk-ink)] px-3 py-1.5 text-xs font-semibold text-white"
              >
                Try again
              </button>
            </div>
          )}

          {!s && data && !loading && !error && (
            <p className="px-4 pb-4 pt-2 text-sm text-[var(--mk-ink-2)]">
              No suggestion for this phase yet.
            </p>
          )}

          {s && (
            <div key={`${anchorId}-${pick}`} className="ai-fade-in">
              {roles.length > 0 && (
                <div className="flex flex-wrap gap-2 px-4 pb-4">
                  {roles.map((m) => (
                    <span
                      key={m.id}
                      className="inline-flex items-center gap-1.5 rounded-[3px] border border-[var(--mk-cyan)] bg-[var(--mk-cyan-soft)] px-1.5 py-0.5 text-xs font-semibold text-[var(--mk-cyan-deep)]"
                      title={m.description ? `${m.name}: ${m.description}` : m.name}
                    >
                      <Tag className="h-3.5 w-3.5" />
                      {m.name}
                    </span>
                  ))}
                </div>
              )}

              {s.text && (
                <p className="mb-3 whitespace-pre-line break-words px-4 text-sm leading-relaxed text-[var(--mk-ink)]">
                  {refs(s.text)}
                </p>
              )}

              <div className="px-4 pb-1 pt-2">
                <h3 className="mb-2 text-[1.15rem] font-bold leading-tight tracking-[-0.03em] text-[var(--mk-ink)]">{refs(s.title)}</h3>
                {s.description && (
                  <p className="mb-3 text-sm leading-relaxed text-[var(--mk-ink-2)]">{refs(s.description)}</p>
                )}
              </div>

              {s.rationale && (
                <div className="mx-4 mb-1 flex gap-2 border-l-2 border-[var(--mk-indigo)] bg-[var(--mk-indigo-soft)] px-3 py-2 text-xs leading-relaxed text-[var(--mk-ink)]">
                  <Compass className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--mk-indigo)]" />
                  <span>{refs(s.rationale)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action row, where a card has like / repost / save */}
        <div className="shrink-0 border-t border-[var(--mk-ink)] px-4 pb-3 pt-3">
          {s && (
            <div className="mb-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onDraft(anchorId, s);
                  hide();
                }}
                className="mk-btn inline-flex flex-1 items-center justify-center gap-1.5 rounded-[4px] bg-[var(--mk-indigo-soft)] px-3 py-2 text-sm font-semibold text-[var(--mk-indigo-deep)]"
              >
                <PenLine className="h-4 w-4" />
                Draft this card
              </button>
              {list.length > 1 && (
                <button
                  type="button"
                  onClick={() => setPick((p) => p + 1)}
                  className="mk-btn inline-flex items-center gap-1.5 rounded-[4px] bg-white px-3 py-2 text-sm font-semibold text-[var(--mk-ink)]"
                  title="Show another suggestion"
                >
                  <Shuffle className="h-4 w-4" />
                  Another
                </button>
              )}
            </div>
          )}
          <div className="text-[11px] text-[var(--mk-ink-2)]">
            Suggested from this space&apos;s cards. It can be wrong.
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
