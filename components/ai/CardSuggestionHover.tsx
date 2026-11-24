"use client";

// Hovering a card (desktop) shows an AI-suggested next card for that
// card's phase, floating beside it. Cards opt in with `data-suggest-id`.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Sparkles, X, Shuffle, Compass, PenLine } from "lucide-react";
import { ROLE_TYPES } from "@/lib/phases";
import { readAuth, signatureOf } from "@/lib/ai/client";
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
const STORAGE_PREFIX = "cardSuggest:v1:";
const WIDTH = 304;
const GAP = 12;
const SHOW_DELAY = 500;
const SWITCH_DELAY = 250;
const HIDE_DELAY = 300;

const roleName = new Map(ROLE_TYPES.map((r) => [r.id, r.name]));

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
        const { token, orgId } = readAuth();
        const res = await fetch("/api/ai/card-suggestions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ layerId, orgId, category, phases, cards, force }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Could not get suggestions.");
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
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [canHover, setCanHover] = useState(false);
  const anchorRef = useRef<number | null>(null);
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

  const hide = useCallback(() => {
    window.clearTimeout(showT.current);
    window.clearTimeout(hideT.current);
    anchorRef.current = null;
    setAnchorId(null);
    setPos(null);
  }, []);

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
        window.clearTimeout(hideT.current);
        return;
      }
      const el = t.closest<HTMLElement>("[data-suggest-id]");
      if (el) {
        window.clearTimeout(hideT.current);
        const id = Number(el.dataset.suggestId);
        if (!cardById.has(id) || id === anchorRef.current) return;
        window.clearTimeout(showT.current);
        showT.current = window.setTimeout(
          () => {
            anchorRef.current = id;
            setAnchorId(id);
            setPick(0);
            ensure();
          },
          anchorRef.current == null ? SHOW_DELAY : SWITCH_DELAY,
        );
      } else {
        window.clearTimeout(showT.current);
        if (anchorRef.current != null) {
          window.clearTimeout(hideT.current);
          hideT.current = window.setTimeout(hide, HIDE_DELAY);
        }
      }
    };
    // Clicking the card itself means the user is busy with it.
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (t?.closest?.("[data-suggest-popover]")) return;
      if (anchorRef.current != null) hide();
      else window.clearTimeout(showT.current);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide();
    };
    document.addEventListener("pointerover", onOver);
    document.addEventListener("pointerdown", onDown, true);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(showT.current);
      window.clearTimeout(hideT.current);
    };
  }, [active, cardById, ensure, hide]);

  // Generation takes ~20s, so start it quietly once the page settles
  // (desktop only); the first hover then usually has it ready. Results are
  // saved per card set, so this runs once per space change, not per view.
  useEffect(() => {
    if (!active) return;
    const t = window.setTimeout(() => ensure(), 2500);
    return () => window.clearTimeout(t);
  }, [active, ensure]);

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

    const h = popRef.current?.offsetHeight ?? 280;
    let left: number;
    let top: number;
    if (r.right + GAP + WIDTH <= vw - 8) {
      left = r.right + GAP;
      top = r.top;
    } else if (r.left - GAP - WIDTH >= 8) {
      left = r.left - GAP - WIDTH;
      top = r.top;
    } else {
      left = Math.min(Math.max(r.left, 8), vw - WIDTH - 8);
      top = r.bottom + GAP;
    }
    top = Math.min(Math.max(top, navBottom + 8), vh - h - 8);
    setPos({ top: Math.round(top), left: Math.round(left) });
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
        width: WIDTH,
        visibility: pos ? "visible" : "hidden",
      }}
    >
      <div className="ai-glass-card overflow-hidden p-4 shadow-[0_18px_40px_-18px_rgba(76,29,149,0.45)]">
        <div className="mb-3 flex items-center gap-2">
          <span className="ai-orb relative grid h-7 w-7 shrink-0 place-items-center rounded-full">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-700">
              Suggested next card
            </div>
            <div className="truncate text-xs text-slate-600">{card.phase}</div>
          </div>
          <button
            type="button"
            onClick={hide}
            className="grid h-7 w-7 place-items-center rounded-full text-slate-500 hover:bg-violet-50 hover:text-violet-700"
            aria-label="Hide suggestion"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!s && (loading || (!data && !error)) && (
          <div className="space-y-2" aria-live="polite">
            <div className="ai-shimmer h-4 w-4/5 rounded-md" />
            <div className="ai-shimmer h-3 w-full rounded-md" />
            <div className="ai-shimmer h-3 w-2/3 rounded-md" />
            <div className="flex items-center gap-2 pt-1 text-xs text-slate-600">
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
          <div className="text-sm">
            <div className="mb-2 font-medium text-rose-600">{error}</div>
            <button
              type="button"
              onClick={() => ensure(true)}
              className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-700"
            >
              Try again
            </button>
          </div>
        )}

        {!s && data && !loading && !error && (
          <p className="text-sm text-slate-600">No suggestion for this phase yet.</p>
        )}

        {s && (
          <div key={`${anchorId}-${pick}`} className="ai-fade-in">
            <h4 className="text-[15px] font-semibold leading-snug text-slate-900">{s.title}</h4>
            {s.description && (
              <p className="mt-1.5 text-[13px] leading-relaxed text-slate-700">{s.description}</p>
            )}
            {s.roleTypes.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {s.roleTypes.map((r) => (
                  <span key={r} className="ai-chip text-[11px]">
                    {roleName.get(r) ?? r}
                  </span>
                ))}
              </div>
            )}
            {s.rationale && (
              <p className="mt-3 flex gap-1.5 text-xs leading-relaxed text-slate-600">
                <Compass className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-600" />
                <span>{s.rationale}</span>
              </p>
            )}
            <div className="mt-3.5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onDraft(anchorId, s);
                  hide();
                }}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-violet-700"
              >
                <PenLine className="h-3.5 w-3.5" />
                Draft this card
              </button>
              {list.length > 1 && (
                <button
                  type="button"
                  onClick={() => setPick((p) => p + 1)}
                  className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-white/70 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-50"
                  title="Show another suggestion"
                >
                  <Shuffle className="h-3.5 w-3.5" />
                  Another
                </button>
              )}
            </div>
          </div>
        )}

        <div className="mt-3 border-t border-violet-100 pt-2 text-[10.5px] text-slate-500">
          Suggested from this space&apos;s cards. It can be wrong.
        </div>
      </div>
    </div>,
    document.body,
  );
}
