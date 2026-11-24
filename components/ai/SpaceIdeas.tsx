"use client";

// Explore: "Suggest a new space" for the selected category. The backend
// reads every space the user can see (top-down), then the cards across all
// categories (bottom-up), and proposes new spaces for this category, each
// as the opening card that would start it.

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Sparkles,
  X,
  Shuffle,
  Compass,
  PenLine,
  Tag,
  GitBranch,
  RefreshCw,
  Layers,
  ArrowRight,
} from "lucide-react";
import { getPhaseById, getRoleTypeById } from "@/lib/phases";
import { readAuth, runSpaceIdeas } from "@/lib/ai/client";
import { withCardRefs } from "@/components/ai/cardRefs";

export type SpaceIdea = {
  kind: string;
  spaceTopic: string;
  seedPhase: string;
  roleTypes: string[];
  title: string;
  description: string;
  text: string;
  rationale: string;
  sourceCardIds: number[];
  nextCards: { phase: string; roleType?: string; title: string }[];
};

type SpaceIdeasResult = {
  category: { id: string; name: string };
  ideas: SpaceIdea[];
  sources: Record<string, { title: string; spaceId: number; spaceName: string; category: string }>;
  read: { spaces: number; cards: number; categories: number; spacesInCategory: number };
  generatedAt: string;
};

type Category = { id: string; name: string; description?: string };

type Props = {
  category: Category;
  /** Display name for a category id (for source cards from elsewhere). */
  categoryName: (id: string) => string;
  /** Explore's label for a phase in this category (roadmap uses buckets). */
  phaseLabel?: (phaseId: string) => string | undefined;
  onOpenCard: (id: number) => void;
  onStart: (idea: SpaceIdea, category: Category) => void;
};

const KIND_LABEL: Record<string, string> = {
  "open-thread": "Open thread",
  "cross-category": "From another category",
  "next-chapter": "Next chapter",
  tension: "Unresolved tension",
  "blind-spot": "Blind spot",
};

const STORAGE_PREFIX = "spaceIdeas:v1:";

const STEPS = [
  "Reading every space, top-down…",
  "Tracing cards bottom-up across categories…",
  "Shaping a space for this category…",
];

const storageKey = (categoryId: string) => {
  const { orgId } = readAuth();
  return `${STORAGE_PREFIX}${orgId ?? "x"}:${categoryId}`;
};

function useSpaceIdeas(category: Category, open: boolean) {
  const [data, setData] = useState<SpaceIdeasResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(
    async (force = false) => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setLoading(true);
      setError(null);
      try {
        const result = await runSpaceIdeas<SpaceIdeasResult>(
          {
            category: category.id,
            categoryName: category.name,
            categoryDescription: category.description,
            force,
          },
          { signal: ac.signal, fallbackError: "Could not suggest a space." },
        );
        if (ac.signal.aborted) return;
        setData(result);
        try {
          sessionStorage.setItem(storageKey(category.id), JSON.stringify(result));
        } catch {
          /* storage full or blocked */
        }
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setError(e?.message || "Could not suggest a space.");
      } finally {
        if (abortRef.current === ac) setLoading(false);
      }
    },
    [category.id, category.name, category.description],
  );

  // On open: show this session's last ideas at once, then check with the
  // server (it returns the saved ideas unless the cards have changed).
  useEffect(() => {
    if (!open) return;
    let cached: SpaceIdeasResult | null = null;
    try {
      cached = JSON.parse(sessionStorage.getItem(storageKey(category.id)) || "null");
    } catch {
      cached = null;
    }
    setData(cached);
    void load(false);
    return () => abortRef.current?.abort();
  }, [open, category.id, load]);

  return { data, loading, error, load };
}

export default function SpaceIdeas(props: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group inline-flex shrink-0 items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-2 text-sm font-semibold text-violet-700 shadow-sm transition hover:border-violet-300 hover:bg-violet-50"
        title={`Suggest a new space for ${props.category.name}`}
      >
        <span className="ai-orb relative grid h-5 w-5 place-items-center rounded-full">
          <Sparkles className="h-3 w-3 text-white" />
        </span>
        <span className="hidden sm:inline">Suggest a new space</span>
        <span className="sm:hidden">New space idea</span>
      </button>
      {open && <SpaceIdeasDialog {...props} onClose={() => setOpen(false)} />}
    </>
  );
}

function SpaceIdeasDialog({
  category,
  categoryName,
  phaseLabel,
  onOpenCard,
  onStart,
  onClose,
}: Props & { onClose: () => void }) {
  const { data, loading, error, load } = useSpaceIdeas(category, true);
  const [pick, setPick] = useState(0);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // Walk through the steps while the model works.
  useEffect(() => {
    if (!loading) return;
    setStep(0);
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 5000);
    return () => clearInterval(t);
  }, [loading]);

  useEffect(() => setPick(0), [data?.generatedAt]);

  const ideas = data?.ideas ?? [];
  const idea = ideas.length ? ideas[pick % ideas.length] : null;
  const refs = (text: string) => withCardRefs(text, onOpenCard);
  const phaseName = (id: string) => phaseLabel?.(id) ?? getPhaseById(id)?.name ?? id;
  const roles = (idea?.roleTypes ?? []).map(
    (id) => getRoleTypeById(id) ?? { id, name: id, description: "" },
  );

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Suggested new space for ${category.name}`}
        className="ai-rise relative flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl border border-violet-200 bg-white shadow-[0_24px_60px_-20px_rgba(76,29,149,0.45),0_8px_20px_-8px_rgba(15,23,42,0.18)] sm:rounded-2xl"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-gray-100 p-4">
          <span className="ai-orb relative grid h-9 w-9 shrink-0 place-items-center rounded-full">
            <Sparkles className="h-4 w-4 text-white" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-gray-900">
                New space for {category.name}
              </span>
              <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
                AI
              </span>
            </div>
            <div className="truncate text-xs text-gray-500">
              {data
                ? `Read ${data.read.spaces} spaces and ${data.read.cards} cards across ${data.read.categories} ${data.read.categories === 1 ? "category" : "categories"}`
                : "Reads every space you can see, then the cards across all categories"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-gray-500 hover:bg-violet-50 hover:text-violet-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {!idea && loading && (
            <div className="space-y-2.5 p-5" aria-live="polite">
              <div className="ai-shimmer h-5 w-2/3 rounded-md" />
              <div className="ai-shimmer h-3 w-full rounded-md" />
              <div className="ai-shimmer h-3 w-11/12 rounded-md" />
              <div className="ai-shimmer h-3 w-3/4 rounded-md" />
              <div className="flex items-center gap-2 pt-2 text-xs text-gray-600">
                <span className="ai-dots">
                  <i />
                  <i />
                  <i />
                </span>
                {STEPS[step]}
              </div>
            </div>
          )}

          {!idea && error && !loading && (
            <div className="p-5 text-sm">
              <div className="mb-2 font-medium text-rose-600">{error}</div>
              <button
                type="button"
                onClick={() => load(false)}
                className="rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white hover:bg-gray-700"
              >
                Try again
              </button>
            </div>
          )}

          {idea && (
            <div key={`${data?.generatedAt}-${pick}`} className="ai-fade-in p-4 sm:p-5">
              {/* The proposed space */}
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-2 py-1 text-xs font-semibold text-violet-700">
                  <Compass className="h-3.5 w-3.5" />
                  {KIND_LABEL[idea.kind] ?? "Idea"}
                </span>
                {ideas.length > 1 && (
                  <span className="text-xs text-gray-500">
                    Idea {(pick % ideas.length) + 1} of {ideas.length}
                  </span>
                )}
              </div>
              <h2 className="mb-4 text-xl font-bold leading-tight text-gray-900">
                {idea.spaceTopic || idea.title}
              </h2>

              {/* Its opening card, laid out like components/card.tsx */}
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Opening card
              </div>
              <div className="mb-4 rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="flex flex-wrap gap-2 px-4 pb-3 pt-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200">
                    <GitBranch className="h-3.5 w-3.5" />
                    {phaseName(idea.seedPhase)}
                  </span>
                  {roles.map((m) => (
                    <span
                      key={m.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-2 py-1 text-xs font-medium text-sky-700 ring-1 ring-sky-200"
                      title={m.description ? `${m.name}: ${m.description}` : m.name}
                    >
                      <Tag className="h-3.5 w-3.5" />
                      {m.name}
                    </span>
                  ))}
                </div>
                {idea.text && (
                  <p className="mb-3 whitespace-pre-line break-words px-4 text-sm leading-relaxed text-gray-800">
                    {refs(idea.text)}
                  </p>
                )}
                <div className="px-4 pb-4 pt-1">
                  <h3 className="mb-2 text-lg font-bold leading-tight text-gray-900">{refs(idea.title)}</h3>
                  {idea.description && (
                    <p className="text-sm leading-relaxed text-gray-600">{refs(idea.description)}</p>
                  )}
                </div>
              </div>

              {idea.rationale && (
                <div className="mb-4 flex gap-2 rounded-xl bg-violet-50 px-3 py-2.5 text-xs leading-relaxed text-violet-900">
                  <Compass className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-600" />
                  <span>
                    <span className="font-semibold">Why this space: </span>
                    {refs(idea.rationale)}
                  </span>
                </div>
              )}

              {idea.sourceCardIds.length > 0 && (
                <div className="mb-4">
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Grows from
                  </div>
                  <ul className="space-y-1">
                    {idea.sourceCardIds.map((id) => {
                      const src = data?.sources[String(id)];
                      return (
                        <li key={id}>
                          <button
                            type="button"
                            onClick={() => onOpenCard(id)}
                            className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-gray-50"
                          >
                            <span className="shrink-0 font-medium text-purple-600">@{id}</span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-gray-800">{src?.title || "Card"}</span>
                              {src && (
                                <span className="flex items-center gap-1 truncate text-xs text-gray-500">
                                  <Layers className="h-3 w-3 shrink-0" />
                                  <span className="truncate">
                                    {src.spaceName} · {categoryName(src.category)}
                                  </span>
                                </span>
                              )}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {idea.nextCards.length > 0 && (
                <div>
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Where it could go
                  </div>
                  <ol className="space-y-1.5">
                    {idea.nextCards.map((n, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                        <span>
                          <span className="font-medium text-indigo-700">{phaseName(n.phase)}</span>
                          {n.roleType && (
                            <span className="text-sky-700">
                              {" "}
                              · {getRoleTypeById(n.roleType)?.name ?? n.roleType}
                            </span>
                          )}
                          <span className="text-gray-400">: </span>
                          {refs(n.title)}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="shrink-0 border-t border-gray-100 px-4 pb-3 pt-3">
          {idea && (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onStart(idea, category)}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-violet-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"
              >
                <PenLine className="h-4 w-4" />
                Start this space
              </button>
              {ideas.length > 1 && (
                <button
                  type="button"
                  onClick={() => setPick((p) => p + 1)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                  title="Show another idea"
                >
                  <Shuffle className="h-4 w-4" />
                  Another
                </button>
              )}
              <button
                type="button"
                onClick={() => load(true)}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-60"
                title="Read everything again and suggest new ideas"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Fresh ideas
              </button>
            </div>
          )}
          <div className="text-[11px] text-gray-500">
            {idea && loading
              ? "Checking for changes since these ideas…"
              : idea && error
                ? error
                : "Built from the cards you can see. It can be wrong."}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
