"use client";

// Ask AI: a one-off thinking chat. Nothing in it is posted; any reply can be
// turned into a card for the space. The scope says what the AI looks at and
// can change mid-conversation: a suggested card, this space, all spaces in
// the workspace, the web, or a plain chat with the model.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUp, PenLine, SquarePlus, ExternalLink, Sparkles } from "lucide-react";
import SectionBox from "@/components/ai/SectionBox";
import { askAI, type ChatMsg } from "@/lib/ai/think";
import { fetchOrgCards, fetchCardsByIds, mentionedIds } from "@/lib/ai/orgCards";
import { withCardRefs } from "@/components/ai/cardRefs";
import type { CardSuggestion } from "@/components/ai/CardSuggestionHover";
import type { SummaryCardInput } from "@/components/modals/SpaceSummaryModal";
import { getPhaseById } from "@/lib/phases";

export type AskScope = "card" | "idea" | "space" | "org" | "web" | "general";

/** A suggested new space (Explore), as context for the "This idea" scope. */
export type AskIdea = { spaceTopic: string; title: string; description: string; text: string; rationale: string; sourceCardIds: number[]; category?: string };

const SCOPE_LABEL: Record<AskScope, string> = {
  card: "This card",
  idea: "This idea",
  space: "This space",
  org: "All spaces",
  web: "Web",
  general: "General",
};

const STARTERS: Record<AskScope, string[]> = {
  card: ["Why this card?", "Challenge it", "What evidence would settle it?", "Make it sharper"],
  idea: ["Is this worth a space?", "What's the sharpest opening question?", "Who should be in it?", "What already exists on this?"],
  space: ["What's blocking a decision?", "Where do people disagree?", "What's missing?"],
  org: ["Has this come up in other spaces?", "What else does this connect to?", "Who has been thinking about this?"],
  web: ["How have other teams solved this?", "What does current research say?"],
  general: [],
};

const PLACEHOLDER: Record<AskScope, string> = {
  card: "Ask about this card, or ask for a change…",
  idea: "Think this idea through before starting the space…",
  space: "Ask anything about this space…",
  org: "Explore an idea across all your spaces…",
  web: "Research something on the web…",
  general: "Think out loud with the AI…",
};

// Web and General answer generally. They bring in team context only when the
// person refers to it: the space ("this space", "our discussion", a phase
// name…) or other spaces ("other spaces", "across the workspace"…). Cards
// mentioned by @id are always looked up.
const MENTIONS_SPACE = new RegExp(
  [
    "\\b(this|our|the) (space|board|whiteboard|discussion|cards?|thread|project)\\b",
    "\\bour\\b",
    "\\b(did|have|had) we\\b",
    "\\bwe(?:'ve| have)?\\s+(discuss(?:ed)?|sa(?:id|y)|talk(?:ed)?|decide(?:d)?|cover(?:ed)?|miss(?:ed)?)\\b",
    "\\b(seed|brainstorm|retro)\\b",
    "\\b(discovery|hypothesis|options|specs|solutioning|decision|execution|documentation)\\s+(phase|stage|cards?)\\b",
    "\\bin here\\b",
  ].join("|"),
  "i",
);
const MENTIONS_ORG = /\b(other|all|across|every) (spaces?|teams?|boards?)\b|\b(workspace|org|organi[sz]ation|elsewhere|company)\b/i;

type Turn = ChatMsg & {
  scope: AskScope;
  cardIds?: number[];
  sources?: { title: string; url: string }[];
  card?: CardSuggestion | null;
  making?: boolean;
};

export default function AskAI({
  initialScope,
  layerId,
  cards,
  category,
  topic,
  anchorId,
  suggestion,
  idea,
  onJumpToCard,
  onUseCard,
  useCardLabel = "Draft this card",
  onDraft,
  onEngage,
  onSend,
  onTurns,
  compact = false,
  composerSlot,
  stickyComposer = false,
  showEmpty = true,
  startersInComposer = false,
  composerTop,
  box,
  note,
  starters,
}: {
  initialScope: AskScope;
  /** The space this chat is in (none on Explore). */
  layerId?: number | null;
  cards: SummaryCardInput[];
  category?: string;
  topic?: string;
  /** The card a suggestion responds to ("This card" scope). */
  anchorId?: number;
  suggestion?: CardSuggestion | null;
  /** A suggested new space ("This idea" scope), on Explore. */
  idea?: AskIdea | null;
  onJumpToCard: (id: number) => void;
  /** Where there's no space to draft into (Explore): use the card directly. */
  onUseCard?: (card: CardSuggestion) => void;
  useCardLabel?: string;
  /** Open Create prefilled with `card`, linked into the space via `anchorId`. */
  onDraft?: (anchorId: number, card: CardSuggestion, phase?: string) => void;
  /** Called on the first interaction (e.g. to pin a hover popover open). */
  onEngage?: () => void;
  /** Called when a message is sent (e.g. to switch a popover to its chat view). */
  onSend?: () => void;
  /** Reports the number of messages so far (e.g. for a "Back to the AI chat" link). */
  onTurns?: (count: number) => void;
  compact?: boolean;
  /** Render the input bar into this element (a panel's footer), so it stays put while the panel scrolls. Pass null while that element isn't mounted. */
  composerSlot?: HTMLElement | null;
  /** Keep the input bar stuck to the bottom of the viewport while this chat is on screen (inline panels). */
  stickyComposer?: boolean;
  /** Show the box with starter prompts before anything is asked. */
  showEmpty?: boolean;
  /** Show the starter prompts just above the input bar until something is asked. */
  startersInComposer?: boolean;
  /** Shown at the top of the input bar (e.g. the folded chat's strip, so it's always in view). */
  composerTop?: React.ReactNode;
  /** Render as its own expandable box (header bar, conversation, input). */
  box?: { open: boolean; onToggle: () => void; scroll?: boolean; sticky?: boolean; bodyClassName?: string; className?: string; containScroll?: boolean };
  /** What the person is looking at (e.g. the open convergence points), sent as extra context. */
  note?: string;
  /** Starter prompts for the initial scope, replacing the defaults. */
  starters?: string[];
}) {
  const scopes: AskScope[] = idea
    ? ["idea", "org", "web", "general"]
    : suggestion
      ? ["card", "space", "org", "web", "general"]
      : ["space", "org", "web", "general"];
  const [scope, setScope] = useState<AskScope>(initialScope);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [ask, setAsk] = useState("");
  const [thinking, setThinking] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inSpace = new Set(cards.map((c) => c.id));

  useEffect(() => {
    if (turns.length) endRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [turns.length, thinking]);

  useEffect(() => {
    onTurns?.(turns.length);
  }, [turns.length]);

  const plain = (list: Turn[]) => list.map(({ role, text }) => ({ role, text }));
  // Any @id in the chat that isn't in this space: fetch it from the workspace
  // so the AI knows what it says, whatever the scope.
  const refCardsFor = async (list: Turn[]) => {
    const ids = mentionedIds(list.map((t) => t.text)).filter((id) => !inSpace.has(id));
    return ids.length ? fetchCardsByIds(ids) : [];
  };
  const size = compact
    ? { text: "text-[12.5px]", chip: "text-[11.5px]", input: "py-1.5 text-[13px]", btn: "h-8 w-8" }
    : { text: "text-[13.5px]", chip: "text-[12px]", input: "py-2 text-[14px]", btn: "h-9 w-9" };

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || thinking) return;
    onEngage?.();
    onSend?.();
    const next: Turn[] = [...turns, { role: "user", text, scope }];
    setTurns(next);
    setAsk("");
    setThinking(true);
    setErr(null);
    try {
      const refCards = await refCardsFor(next);
      let turn: Turn;
      if (scope === "card" && suggestion && anchorId != null) {
        const r = await askAI<{ reply: string; card?: CardSuggestion | null }>("chat-card", {
          layerId,
          category,
          cards,
          anchorId,
          suggestion,
          messages: plain(next),
          refCards,
          note,
        });
        turn = { role: "ai", text: r.reply, scope, card: r.card ?? null };
      } else if (scope === "space" || scope === "card") {
        const r = await askAI<{ reply: string; cardIds: number[] }>("chat-space", { layerId, category, topic, cards, messages: plain(next), refCards, note });
        turn = { role: "ai", text: r.reply, scope, cardIds: r.cardIds };
      } else {
        // All spaces: the workspace is the point. Web / General: only what the
        // person has referred to in their messages.
        const said = next.filter((t) => t.role === "user").map((t) => t.text).join("\n");
        const wantSpace = scope === "org" || MENTIONS_SPACE.test(said);
        const wantOrg = scope === "org" || scope === "idea" || MENTIONS_ORG.test(said);
        const orgCards = wantOrg ? await fetchOrgCards().catch(() => undefined) : undefined;
        const r = await askAI<{ reply: string; cardIds: number[]; sources: { title: string; url: string }[] }>("chat-wide", {
          layerId: layerId ?? undefined,
          scope,
          category,
          topic: wantSpace ? topic : undefined,
          cards: wantSpace ? cards : [],
          orgCards,
          idea: scope === "idea" || MENTIONS_SPACE.test(said) ? idea : undefined,
          messages: plain(next),
          refCards,
          note,
        });
        // Plain text in the panel: drop markdown emphasis the web model sometimes adds.
        turn = { role: "ai", text: r.reply.replace(/\*\*(.+?)\*\*/g, "$1").replace(/^\s*[*]\s+/gm, "- "), scope, cardIds: r.cardIds, sources: r.sources };
      }
      setTurns([...next, turn]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "The AI couldn't reply.");
    } finally {
      setThinking(false);
    }
  };

  const makeCard = async (i: number) => {
    const t = turns[i];
    if (!t || t.making) return;
    setTurns((all) => all.map((x, j) => (j === i ? { ...x, making: true } : x)));
    try {
      const card = await askAI<CardSuggestion>("to-card", {
        layerId: layerId ?? undefined,
        category,
        topic,
        cards,
        refCards: await refCardsFor(turns.slice(0, i + 1)),
        idea: idea ?? undefined,
        note,
        messages: plain(turns.slice(0, i + 1)),
        focus: t.text + (t.sources?.length ? `\nSources: ${t.sources.map((s) => s.url).join(" ")}` : ""),
      });
      setTurns((all) => all.map((x, j) => (j === i ? { ...x, card, making: false } : x)));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't turn that into a card.");
      setTurns((all) => all.map((x, j) => (j === i ? { ...x, making: false } : x)));
    }
  };

  // A drafted card joins this space through the card it builds on most.
  const anchorFor = (card: CardSuggestion) => card.relatedCardIds.find((id) => inSpace.has(id)) ?? anchorId ?? cards[0]?.id;
  const refs = (t: string) => withCardRefs(t, onJumpToCard);

  const scopeRow = (
    <div className="flex flex-wrap items-center gap-1" role="radiogroup" aria-label="What the AI looks at">
      {scopes.map((sc) => (
        <button
          key={sc}
          type="button"
          role="radio"
          aria-checked={scope === sc}
          onClick={() => setScope(sc)}
          className={`rounded-[3px] px-1.5 py-0.5 ${size.chip} font-semibold tracking-tight transition-colors ${
            scope === sc ? "bg-[var(--mk-ink)] text-white" : "text-[var(--mk-ink-2)] hover:bg-[var(--mk-indigo-soft)] hover:text-[var(--mk-ink)]"
          }`}
        >
          {SCOPE_LABEL[sc]}
        </button>
      ))}
    </div>
  );

  // The input bar: what the AI looks at, and the field. Lives in a panel's
  // footer (composerSlot) or sticks to the bottom of the screen.
  const startersFor = (sc: AskScope) => (starters && sc === initialScope ? starters : STARTERS[sc]);
  const starterChips = (
    <div className="flex flex-wrap gap-1.5">
      {startersFor(scope).map((chip) => (
        <button
          key={chip}
          type="button"
          onClick={() => send(chip)}
          className={`rounded-[3px] border border-[var(--mk-ink)] bg-white px-2 py-0.5 ${size.chip} font-semibold tracking-tight hover:bg-[var(--mk-indigo-soft)]`}
        >
          {chip}
        </button>
      ))}
    </div>
  );

  const composer = (
    <div className="space-y-1.5">
      {composerTop}
      {startersInComposer && turns.length === 0 && !thinking && startersFor(scope).length > 0 && starterChips}
      {scopeRow}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(ask);
        }}
        className="flex items-center gap-1.5"
      >
        <input
          data-ask-input
          value={ask}
          onChange={(e) => setAsk(e.target.value)}
          onFocus={onEngage}
          placeholder={PLACEHOLDER[scope]}
          aria-label="Ask AI"
          className={`min-w-0 flex-1 rounded-[4px] border border-[var(--mk-ink)] bg-white px-2.5 ${size.input} tracking-tight placeholder:text-[#8a8ea0] focus:shadow-[2px_2px_0_var(--mk-indigo)] focus:outline-none`}
        />
        <button
          type="submit"
          disabled={thinking || !ask.trim()}
          className={`grid ${size.btn} shrink-0 place-items-center rounded-[4px] bg-[var(--mk-indigo)] text-white disabled:opacity-40`}
          aria-label="Send"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </form>
    </div>
  );

  const hasThread = turns.length > 0 || thinking || !!err;
  const threadInner = (
    <>
      {turns.length === 0 && !startersInComposer && startersFor(scope).length > 0 && starterChips}
      {turns.length === 0 && startersFor(scope).length === 0 && !thinking && (
        <p className={`${size.text} text-[var(--mk-ink-2)]`}>Ask anything below.</p>
      )}

      <div className="space-y-2.5">
        {turns.map((t, i) =>
          t.role === "user" ? (
            <p key={i} className={`ml-8 rounded-[4px] bg-[var(--mk-ink)] px-2.5 py-1.5 ${size.text} leading-snug text-white`}>
              {t.text}
            </p>
          ) : (
            <div key={i}>
              <p className="mb-1 text-[9.5px] font-semibold uppercase tracking-[0.09em] text-[var(--mk-indigo)]">
                {SCOPE_LABEL[t.scope]}
                {t.scope === "general" && !!t.sources?.length && " · searched the web"}
              </p>
              <p className={`whitespace-pre-line ${size.text} leading-relaxed text-[var(--mk-ink)]`}>{refs(t.text)}</p>
              {!!t.sources?.length && (
                <ul className="mt-2 space-y-0.5 border-l-2 border-[var(--mk-cyan)] pl-2">
                  <li className="text-[9.5px] font-semibold uppercase tracking-[0.09em] text-[var(--mk-ink-2)]">Sources</li>
                  {t.sources.map((s) => (
                    <li key={s.url}>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[var(--mk-cyan-deep,#08596c)] hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {s.title}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              {!t.card && (onDraft || onUseCard) && (
                <button
                  type="button"
                  disabled={t.making}
                  onClick={() => makeCard(i)}
                  className="mt-1.5 inline-flex items-center gap-1.5 text-[12px] font-semibold tracking-tight text-[var(--mk-indigo)] hover:underline disabled:opacity-60"
                >
                  <SquarePlus className="h-3.5 w-3.5" />
                  {t.making ? "Shaping a card…" : "Turn into card"}
                </button>
              )}
              {t.card && (
                <div className="mt-2 rounded-[4px] border border-[var(--mk-ink)] bg-white p-2.5 shadow-[2px_2px_0_var(--mk-ink)]">
                  {(t.card.phase || t.card.roleTypes.length > 0) && (
                    <p className="mb-1 text-[9.5px] font-semibold uppercase tracking-[0.09em]">
                      {t.card.phase && <span className="text-[var(--mk-indigo)]">{getPhaseById(t.card.phase)?.name ?? t.card.phase}</span>}
                      {t.card.roleTypes.map((r) => (
                        <span key={r} className="text-[var(--mk-cyan)]">
                          {" · "}
                          {r.replace(/-/g, " ")}
                        </span>
                      ))}
                    </p>
                  )}
                  <p className="text-[13.5px] font-bold leading-snug tracking-[-0.02em]">{refs(t.card.title)}</p>
                  {t.card.description && <p className="mt-1 text-[12px] italic leading-snug text-[var(--mk-ink-2)]">{refs(t.card.description)}</p>}
                  {t.card.text && <p className="mt-1 text-[12px] leading-snug">{refs(t.card.text)}</p>}
                  {(onUseCard || onDraft) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (onUseCard) return onUseCard(t.card!);
                        const a = anchorFor(t.card!);
                        if (a != null) onDraft?.(a, t.card!, t.card!.phase);
                      }}
                      className="mk-btn mt-2 inline-flex items-center gap-1.5 rounded-[4px] bg-[var(--mk-indigo-soft)] px-2.5 py-1 text-[12px] font-semibold text-[var(--mk-indigo-deep)]"
                    >
                      <PenLine className="h-3.5 w-3.5" /> {useCardLabel}
                    </button>
                  )}
                </div>
              )}
            </div>
          ),
        )}
        {thinking && (
          <div className="flex items-center gap-2 text-[11.5px] text-[var(--mk-ink-2)]" aria-live="polite">
            <span className="ai-dots">
              <i />
              <i />
              <i />
            </span>
            {scope === "web" ? "Searching the web…" : scope === "org" ? "Reading across your spaces…" : "Thinking…"}
          </div>
        )}
        {err && !thinking && <p className="text-[11.5px] text-[var(--mk-amber)]">{err}</p>}
        <div ref={endRef} />
      </div>
    </>
  );

  if (box) {
    return (
      <SectionBox
        label="Ask AI"
        icon={<Sparkles className="h-3.5 w-3.5 text-[var(--mk-indigo)]" />}
        hint={turns.length ? `${turns.length} ${turns.length === 1 ? "message" : "messages"} · not posted` : "Not posted"}
        open={box.open}
        onToggle={box.onToggle}
        scroll={box.scroll ?? true}
        sticky={box.sticky}
        bodyClassName={box.bodyClassName}
        containScroll={box.containScroll ?? true}
        className={box.className}
        footerWhenClosed
        footer={<div className={compact ? "p-2.5" : "p-3"}>{composer}</div>}
      >
        <div className={compact ? "p-3" : "p-4"}>
          {turns.length === 0 && !thinking && !err ? (
            <>
              <p className={`${size.text} text-[var(--mk-ink-2)]`}>
                Think it through here before anything is posted. Ask below{startersFor(scope).length ? ", or pick a prompt" : ""}.
              </p>
              {!startersInComposer && startersFor(scope).length > 0 && <div className="mt-2.5">{starterChips}</div>}
            </>
          ) : (
            threadInner
          )}
        </div>
      </SectionBox>
    );
  }

  const thread = (hasThread || showEmpty) && (
    <div className={`rounded-[5px] border border-[var(--mk-ink)] bg-white ${compact ? "p-3" : "p-4"}`}>
      <p className="mb-2.5 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-[var(--mk-ink-2)]">Ask AI · not posted</p>
      {threadInner}
    </div>
  );

  return (
    <>
      {thread}
      {/* composerSlot: an element → portal into it; null → its panel isn't
          mounted yet, render nothing; undefined → inline. */}
      {composerSlot
        ? createPortal(composer, composerSlot)
        : composerSlot === undefined && (
            <div
              className={
                stickyComposer
                  ? "sticky bottom-0 z-10 -mx-1 mt-3 border-t border-[var(--mk-ink)] bg-[var(--mk-paper)] px-1 pb-3 pt-2.5"
                  : "mt-2.5"
              }
            >
              {composer}
            </div>
          )}
    </>
  );
}
