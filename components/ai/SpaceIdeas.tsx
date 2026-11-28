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
import { PixelIcon } from "@/components/marketing/Bitmap";
import { PixelLabel, btn } from "@/components/app/ui";
import AskAI from "@/components/ai/AskAI";
import SectionBox from "@/components/ai/SectionBox";

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
      className={`mk-btn inline-flex shrink-0 items-center gap-2 rounded-[4px] px-4 py-2.5 text-[14px] font-semibold tracking-tight ${
        open ? "bg-[var(--mk-ink)] text-white" : "bg-white text-[var(--mk-ink)]"
      }`}
    >
      <PixelIcon name="spark" color={open ? "#8fe3f3" : "var(--mk-indigo)"} className="h-4 w-4" />
      <span className="hidden sm:inline">Suggest a new space</span>
      <span className="sm:hidden">New space</span>
    </button>
  );
}

/**
 * The idea, in the page: its opening card drawn by the same Card component
 * as every card below, on the same column grid, with the space it would
 * start beside it.
 */
// Height cap for whichever box is open: the screen minus the top bar, the
// panel's header and the other box's header bar and input, so both boxes fit.
const BOX_MAX_H = "max-h-[max(14rem,calc(100vh-21rem))]";

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
  // Two views: the suggested space, or the Ask AI chat about it alone.
  // Sending a message opens the chat; "Back" returns, keeping the chat.
  const [view, setView] = useState<"idea" | "chat">("idea");
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!loading) return;
    setStep(0);
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 5000);
    return () => clearInterval(t);
  }, [loading]);

  useEffect(() => setPick(0), [data?.generatedAt]);

  const ideas = data?.ideas ?? [];
  // New ideas (e.g. "Fresh ideas") start a new chat: show the idea again.
  useEffect(() => setView("idea"), [data?.generatedAt]);

  // On opening, bring the panel up under the top bar so both boxes have room.
  const sectionRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    sectionRef.current?.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
  }, []);
  const idea = ideas.length ? ideas[pick % ideas.length] : null;
  const refs = (text: string) => withCardRefs(text, onOpenCard);
  const phaseName = (id: string) => phaseLabel?.(id) ?? getPhaseById(id)?.name ?? id;

  return (
    <section
      ref={sectionRef}
      id="space-ideas"
      aria-label={`Suggested new space for ${category.name}`}
      className="ai-fade-in mb-4 scroll-mt-20 px-2 md:mb-6 md:px-0"
    >
      {/* Section header: what this is, what it read, and the controls */}
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <PixelLabel>Suggested new space</PixelLabel>
        <span className="min-w-0 flex-1 truncate text-[12.5px] tracking-tight text-[var(--mk-ink-2)]">
          {data
            ? `Read ${data.read.spaces} spaces and ${data.read.cards} cards across ${data.read.categories} ${data.read.categories === 1 ? "category" : "categories"}`
            : "Reads every space you can see, then the cards across all categories"}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="grid h-8 w-8 place-items-center rounded-[4px] border border-[var(--mk-ink)] bg-white hover:bg-[var(--mk-indigo-soft)]"
          aria-label="Hide suggested space"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Two separate boxes: the suggested space with its actions, and the Ask
          AI chat with its input. One is open at a time; each header bar switches. */}
      {/* Stacked: the open box expands, the other collapses to its header bar.
          The open box's content is capped to the screen height (scrolling
          inside), so the Ask AI box is always in view without page scrolling. */}
      <div className="flex flex-col gap-3">
      <SectionBox
        label="Suggested space"
        hint={<span className="font-semibold text-[var(--mk-ink)]">{idea?.spaceTopic || idea?.title}</span>}
        open={view === "idea"}
        onToggle={() => setView(view === "idea" ? "chat" : "idea")}
        bodyClassName={BOX_MAX_H}
        containScroll={false}
      >
      {/* Same columns as the card grid below: card in one, context across the rest */}
      <div className="grid grid-cols-1 items-start gap-6 p-4 md:grid-cols-3 lg:grid-cols-4">
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
              <p className="mt-3 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-[var(--mk-ink-2)]">
                How the opening card would look. Click it to draft.
              </p>
            </div>
          ) : (
            <div className="rounded-[5px] border border-[var(--mk-ink)] bg-white p-5 shadow-[2px_2px_0_var(--mk-ink)]" aria-hidden>
              <div className="mb-3 flex items-center gap-3">
                <div className="ai-shimmer h-8 w-8 rounded-[3px]" />
                <div className="ai-shimmer h-3 w-24 rounded-[3px]" />
              </div>
              <div className="mb-3 flex gap-2">
                <div className="ai-shimmer h-6 w-28 rounded-[3px]" />
                <div className="ai-shimmer h-6 w-20 rounded-[3px]" />
              </div>
              <div className="space-y-2">
                <div className="ai-shimmer h-3 w-full rounded-[3px]" />
                <div className="ai-shimmer h-3 w-11/12 rounded-[3px]" />
                <div className="ai-shimmer h-3 w-4/5 rounded-[3px]" />
                <div className="ai-shimmer h-3 w-full rounded-[3px]" />
                <div className="ai-shimmer h-3 w-2/3 rounded-[3px]" />
              </div>
              <div className="ai-shimmer mt-4 h-5 w-3/4 rounded-[3px]" />
            </div>
          )}
        </div>

        <div className="min-w-0 md:col-span-2 lg:col-span-3">
          <div className="mk-hard rounded-[6px] bg-white p-5 sm:p-6">
            {!idea && !error && (
              <div className="flex min-h-[14rem] flex-col justify-center gap-3" aria-live="polite">
                <div className="ai-shimmer h-6 w-2/3 rounded-[3px]" />
                <div className="ai-shimmer h-3 w-full rounded-[3px]" />
                <div className="ai-shimmer h-3 w-5/6 rounded-[3px]" />
                <div className="flex items-center gap-2 pt-1 text-xs text-[var(--mk-ink-2)]">
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
                <div className="font-medium text-[var(--mk-amber)]">{error}</div>
                <div>
                  <button
                    type="button"
                    onClick={() => load(false)}
                    className="mk-btn rounded-[4px] bg-[var(--mk-ink)] px-3 py-1.5 text-[13px] font-semibold text-white"
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}

            {idea && (
              <div key={`${data?.generatedAt}-${pick}`} className="ai-fade-in flex flex-col gap-4">
                <div className="flex flex-col gap-4">
                <div>
                  <span className="mb-2 inline-flex items-center gap-1.5 rounded-[3px] border border-[var(--mk-amber)] bg-[var(--mk-amber-soft)] px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-[var(--mk-amber)]">
                    <Compass className="h-3.5 w-3.5" />
                    {KIND_LABEL[idea.kind] ?? "Idea"}
                  </span>
                  <h2 className="mk-display mt-2 text-[1.9rem] sm:text-[2.2rem]">
                    {idea.spaceTopic || idea.title}
                  </h2>
                  {idea.rationale && (
                    <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--mk-ink)]">
                      {refs(idea.rationale)}
                    </p>
                  )}
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  {idea.sourceCardIds.length > 0 && (
                    <div className="min-w-0">
                      <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-[var(--mk-ink-2)]">
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
                                className="flex w-full items-start gap-2 border-t border-[var(--mk-rule)] px-1 py-2 text-left text-[14px] tracking-tight hover:bg-[var(--mk-indigo-soft)]"
                              >
                                <span className="shrink-0 font-medium text-[var(--mk-indigo)]">@{id}</span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-[var(--mk-ink)]">{src?.title || "Card"}</span>
                                  {src && (
                                    <span className="flex items-center gap-1 truncate text-xs text-[var(--mk-ink-2)]">
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
                      <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-[var(--mk-ink-2)]">
                        Where it could go
                      </div>
                      <ol className="space-y-2 px-2 pt-1.5">
                        {idea.nextCards.map((n, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-[var(--mk-ink)]">
                            <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--mk-ink-2)]" />
                            <span>
                              <span className="font-semibold text-[var(--mk-indigo)]">{phaseName(n.phase)}</span>
                              {n.roleType && (
                                <span className="text-[var(--mk-cyan)]">
                                  {" "}
                                  · {getRoleTypeById(n.roleType)?.name ?? n.roleType}
                                </span>
                              )}
                              <span className="text-[var(--mk-ink-2)]">: </span>
                              {refs(n.title)}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-dashed border-[#b6b8c2] pt-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onStart(idea, category)}
                      // Soft violet: the primary action without a bright fill
                      className={`${btn.primary} px-4 py-2 text-[14px]`}
                    >
                      <PenLine className="h-4 w-4" />
                      Start this space
                    </button>
                    {ideas.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setPick((p) => p + 1);
                          setView("idea");
                        }}
                        className={`${btn.plain} px-3 py-2 text-[14px]`}
                        title="Show another idea"
                      >
                        <Shuffle className="h-4 w-4" />
                        Another
                        <span className="text-xs text-[var(--mk-ink-2)] tabular-nums">
                          {(pick % ideas.length) + 1}/{ideas.length}
                        </span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => load(true)}
                      disabled={loading}
                      className={`${btn.plain} px-3 py-2 text-[14px]`}
                      title="Read everything again and suggest new ideas"
                    >
                      <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                      Fresh ideas
                    </button>
                  </div>
                  <span className="text-[11px] text-[var(--mk-ink-2)]">
                    {loading
                      ? "Checking for changes since these ideas…"
                      : error
                        ? error
                        : "Built from the cards you can see. It can be wrong."}
                  </span>
                </div>

                </div>

              </div>
            )}
          </div>
        </div>
      </div>
      </SectionBox>

      {idea && (
          <AskAI
                      key={`${data?.generatedAt}-${pick}`}
                      initialScope="idea"
                      box={{
                        open: view === "chat",
                        onToggle: () => setView(view === "chat" ? "idea" : "chat"),
                        // Long chats scroll inside the box, so the page keeps its shape.
                        bodyClassName: BOX_MAX_H,
                        // At the end of the chat, keep scrolling the page.
                        containScroll: false,
                      }}
                      startersInComposer
                      onSend={() => setView("chat")}
                      cards={[]}
                      category={category.name}
                      idea={{ ...idea, category: category.name }}
                      onJumpToCard={onOpenCard}
                      useCardLabel="Start space with this card"
                      onUseCard={(c) =>
                        onStart(
                          {
                            ...idea,
                            title: c.title,
                            description: c.description,
                            text: c.text,
                            seedPhase: c.phase ?? idea.seedPhase,
                            roleTypes: c.roleTypes.length ? c.roleTypes : idea.roleTypes,
                          },
                          category,
                        )
                      }
                    />
      )}
      </div>
    </section>
  );
}
