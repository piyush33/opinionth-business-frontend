"use client";

// Explore: "Suggest a new space" for the selected category. The backend
// reads every space the user can see (top-down), then the cards across all
// categories (bottom-up), and proposes new spaces for this category, each
// as the opening card that would start it.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Sparkles,
  X,
  Shuffle,
  Compass,
  PenLine,
  RefreshCw,
  Layers,
  ArrowRight,
} from "lucide-react";
import { getPhaseById, getRoleTypeById } from "@/lib/phases";
import { readAuth, runSpaceIdeas } from "@/lib/ai/client";
import { withCardRefs } from "@/components/ai/cardRefs";
import Card from "@/components/card";

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

/**
 * Header trigger, styled like the space page's Summary button: a pill with a
 * gradient rim, sparkles and gradient text.
 */
export function SpaceIdeasButton({
  open,
  onToggle,
  categoryName,
}: {
  open: boolean;
  onToggle: () => void;
  categoryName: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls="space-ideas"
      title={`Suggest a new space for ${categoryName}`}
      className="group relative inline-flex shrink-0 items-center gap-1.5 rounded-full p-[1px] bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-400 shadow-[0_6px_20px_-8px_rgba(99,102,241,.6)] transition hover:shadow-[0_8px_26px_-8px_rgba(99,102,241,.8)]"
    >
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium text-slate-700 backdrop-blur ${
          open ? "bg-white/70" : "bg-white/90 group-hover:bg-white/70"
        }`}
      >
        <Sparkles className="h-4 w-4 text-violet-600 transition-transform group-hover:rotate-12" />
        <span className="bg-gradient-to-r from-violet-700 to-blue-700 bg-clip-text text-transparent">
          <span className="hidden sm:inline">Suggest a new space</span>
          <span className="sm:hidden">New space</span>
        </span>
      </span>
    </button>
  );
}

/**
 * The idea, in the page: its opening card drawn by the same Card component
 * as every card below, on the same column grid, with the space it would
 * start beside it.
 */
export default function SpaceIdeasPanel({
  category,
  categoryName,
  phaseLabel,
  onOpenCard,
  onStart,
  onClose,
  viewer,
  tone,
}: Props & {
  onClose: () => void;
  viewer: { username: string; picture?: string };
  /** The category's icon colours (Tailwind classes), e.g. text-orange-700 / bg-orange-100. */
  tone?: { color: string; bgColor: string };
}) {
  const { data, loading, error, load } = useSpaceIdeas(category, true);
  const [pick, setPick] = useState(0);
  const [step, setStep] = useState(0);

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

  return (
    <section
      id="space-ideas"
      aria-label={`Suggested new space for ${category.name}`}
      className="ai-fade-in mb-4 md:mb-6 px-2 md:px-0"
    >
      {/* Section header: what this is, what it read, and the controls */}
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        {/* Same tile as the category header icon, in the category's colours */}
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${tone?.bgColor ?? "bg-violet-100"}`}
        >
          <Sparkles className={`h-4 w-4 ${tone?.color ?? "text-violet-700"}`} />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
            Suggested new space
          </div>
          <div className="truncate text-xs text-slate-500">
            {data
              ? `Read ${data.read.spaces} spaces and ${data.read.cards} cards across ${data.read.categories} ${data.read.categories === 1 ? "category" : "categories"}`
              : "Reads every space you can see, then the cards across all categories"}
          </div>
        </div>
        <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-gray-500 hover:bg-violet-50 hover:text-violet-700"
            aria-label="Hide suggested space"
          >
            <X className="h-4 w-4" />
          </button>
      </div>

      {/* Same columns as the card grid below: card in one, context across the rest */}
      <div className="grid grid-cols-1 items-start gap-2 md:grid-cols-3 lg:grid-cols-4">
        <div className="min-w-0">
          {idea ? (
            <div key={`${data?.generatedAt}-${pick}`} className="ai-fade-in">
              <Card
                user={viewer.username}
                picture={viewer.picture}
                title={idea.title}
                description={idea.description}
                text={idea.text}
                onClick={() => onStart(idea, category)}
                onUserTagClick={() => {}}
                onCardTagClick={onOpenCard}
                phaseId={idea.seedPhase}
                roleTypeId={idea.roleTypes}
                phaseLabelOverride={phaseLabel?.(idea.seedPhase)}
                feed="explore"
              />
              <p className="mt-1 px-1 text-[11px] text-slate-500">
                How the opening card would look. Click it to draft.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-lg" aria-hidden>
              <div className="mb-3 flex items-center gap-3">
                <div className="ai-shimmer h-8 w-8 rounded-full" />
                <div className="ai-shimmer h-3 w-24 rounded-md" />
              </div>
              <div className="mb-3 flex gap-2">
                <div className="ai-shimmer h-6 w-28 rounded-full" />
                <div className="ai-shimmer h-6 w-20 rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="ai-shimmer h-3 w-full rounded-md" />
                <div className="ai-shimmer h-3 w-11/12 rounded-md" />
                <div className="ai-shimmer h-3 w-4/5 rounded-md" />
                <div className="ai-shimmer h-3 w-full rounded-md" />
                <div className="ai-shimmer h-3 w-2/3 rounded-md" />
              </div>
              <div className="ai-shimmer mt-4 h-5 w-3/4 rounded-md" />
            </div>
          )}
        </div>

        <div className="min-w-0 md:sticky md:top-20 md:col-span-2 lg:col-span-3">
          <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/70 via-white to-sky-50/60 p-4 sm:p-5">
            {!idea && !error && (
              <div className="flex min-h-[14rem] flex-col justify-center gap-3" aria-live="polite">
                <div className="ai-shimmer h-6 w-2/3 rounded-md" />
                <div className="ai-shimmer h-3 w-full rounded-md" />
                <div className="ai-shimmer h-3 w-5/6 rounded-md" />
                <div className="flex items-center gap-2 pt-1 text-xs text-gray-600">
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
              <div className="flex min-h-[14rem] flex-col justify-center gap-2 text-sm">
                <div className="font-medium text-rose-600">{error}</div>
                <div>
                  <button
                    type="button"
                    onClick={() => load(false)}
                    className="rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white hover:bg-gray-700"
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}

            {idea && (
              <div key={`${data?.generatedAt}-${pick}`} className="ai-fade-in flex flex-col gap-4">
                <div>
                  <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-2 py-1 text-xs font-semibold text-violet-700">
                    <Compass className="h-3.5 w-3.5" />
                    {KIND_LABEL[idea.kind] ?? "Idea"}
                  </span>
                  <h2 className="text-xl font-bold leading-tight text-gray-900 sm:text-2xl">
                    {idea.spaceTopic || idea.title}
                  </h2>
                  {idea.rationale && (
                    <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-700">
                      {refs(idea.rationale)}
                    </p>
                  )}
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  {idea.sourceCardIds.length > 0 && (
                    <div className="min-w-0">
                      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                        Grows from
                      </div>
                      <ul className="space-y-0.5">
                        {idea.sourceCardIds.map((id) => {
                          const src = data?.sources[String(id)];
                          return (
                            <li key={id}>
                              <button
                                type="button"
                                onClick={() => onOpenCard(id)}
                                className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-white/80"
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
                    <div className="min-w-0">
                      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                        Where it could go
                      </div>
                      <ol className="space-y-2 px-2 pt-1.5">
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

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-violet-100 pt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onStart(idea, category)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"
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
                        <span className="text-xs text-gray-400 tabular-nums">
                          {(pick % ideas.length) + 1}/{ideas.length}
                        </span>
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
                  <span className="text-[11px] text-gray-500">
                    {loading
                      ? "Checking for changes since these ideas…"
                      : error
                        ? error
                        : "Built from the cards you can see. It can be wrong."}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
