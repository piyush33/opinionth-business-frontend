"use client";

// Converge: help a space reach agreement without a meeting. Shows the open
// points (all, or one phase's), the positions on each with the cards behind
// them, and the vote. A position converges once more than half of the people
// who contributed to that phase back it; then anyone can draft the
// convergence card, whose phase fits what it settles (not always Decision)
// and which states the balance of the vote. While it's still split, a focused
// 15-minute call agenda is on offer.
import { useEffect, useState } from "react";
import { X, RefreshCw, PenLine, Copy, Check, GitMerge, Phone, Lock } from "lucide-react";
import { askAI } from "@/lib/ai/think";
import { withCardRefs } from "@/components/ai/cardRefs";
import type { CardSuggestion } from "@/components/ai/CardSuggestionHover";
import type { SummaryCardInput } from "@/components/modals/SpaceSummaryModal";
import { ACROSS, type Convergence, type ConvergePoint } from "@/lib/ai/useConvergence";
import { getPhaseById } from "@/lib/phases";
import { btn, tag } from "@/components/app/ui";
import CallOutcome from "@/components/ai/CallOutcome";
import { TimerControl } from "@/components/ai/ConvergeTimer";
import AskAI from "@/components/ai/AskAI";
import SectionBox from "@/components/ai/SectionBox";

type Outcome = {
  decision: CardSuggestion;
  agenda: { goal: string; items: string[]; prereadCardIds: number[] };
};

const STATUS: Record<string, { label: string; cls: string }> = {
  split: { label: "Split", cls: "border-[var(--mk-amber)] bg-[var(--mk-amber-soft)] text-[var(--mk-amber)]" },
  leaning: { label: "Leaning", cls: "border-[var(--mk-green)] bg-[var(--mk-green-soft)] text-[var(--mk-green)]" },
  open: { label: "Open", cls: "border-[var(--mk-ink-2)] bg-white text-[var(--mk-ink-2)]" },
  converged: { label: "Converged", cls: "border-[var(--mk-indigo)] bg-[var(--mk-indigo)] text-white" },
};

export default function ConvergePanel({
  open,
  onClose,
  convergence,
  phase,
  cards,
  category,
  topic,
  onJumpToCard,
  onDraft,
}: {
  open: boolean;
  onClose: () => void;
  convergence: Convergence;
  /** Show one phase's points (a phase label), or all of them (null). */
  phase: string | null;
  cards: SummaryCardInput[];
  category?: string;
  topic?: string;
  onJumpToCard: (id: number) => void;
  /** Open Create with the convergence card in the phase it belongs to. */
  onDraft: (anchorId: number, card: CardSuggestion, phase?: string) => void;
}) {
  const { points: all, analysing, error, analyse, vote, tallyOf, stale, timers, timer } = convergence;
  const [outcomes, setOutcomes] = useState<Record<string, Outcome | "loading" | "agenda-loading" | string>>({});
  const [copied, setCopied] = useState<string | null>(null);
  // Two boxes: the open points, and one Ask AI chat for all of them. One is
  // expanded at a time; sending a message opens the chat.
  const [view, setView] = useState<"points" | "chat">("points");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const points = phase ? all.filter((p) => p.phase === phase) : all;
  const jump = (id: number) => {
    onClose();
    onJumpToCard(id);
  };
  const refs = (t: string) => withCardRefs(t, jump);

  const run = async (point: ConvergePoint, mode: "draft" | "agenda") => {
    const t = tallyOf(point);
    setOutcomes((o) => ({ ...o, [point.id]: mode === "draft" ? "loading" : "agenda-loading" }));
    try {
      const res = await askAI<Outcome>("decide", {
        layerId: convergence.layerId,
        category,
        cards,
        point,
        choice: t.winner != null ? point.positions[t.winner].stance : undefined,
        votes: point.positions.map((p, i) => ({ stance: p.stance, voters: t.voters[i] })),
        participants: t.eligible.size,
      });
      setOutcomes((o) => ({ ...o, [point.id]: res }));
    } catch (e) {
      setOutcomes((o) => ({ ...o, [point.id]: e instanceof Error ? e.message : "Couldn't draft it." }));
    }
  };

  const copyAgenda = async (point: ConvergePoint, agenda: Outcome["agenda"]) => {
    const text = [
      `15-min call: ${point.question}`,
      `Goal: ${agenda.goal}`,
      ...agenda.items.map((it, n) => `${n + 1}. ${it}`),
      agenda.prereadCardIds.length ? `Read first: ${agenda.prereadCardIds.map((id) => `@${id}`).join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(point.id);
      window.setTimeout(() => setCopied((c) => (c === point.id ? null : c)), 1600);
    } catch {
      /* clipboard blocked */
    }
  };

  const anchorOf = (card: CardSuggestion, point: ConvergePoint) =>
    card.relatedCardIds[0] ?? point.positions[0]?.cardIds[0] ?? cards[0]?.id;

  const scopeName = phase ?? topic ?? "this-space";

  // What Ask AI sees beyond the cards: the open points and how the vote stands.
  const note = points.length
    ? `Converge panel${phase ? ` for ${phase}` : ""}. Open points:\n${points
        .map((p, i) => {
          const t = tallyOf(p);
          return `${i + 1}. [${p.phase}] ${p.question}\n${p.positions
            .map((x, k) => `   - "${x.stance}" (${x.cardIds.map((id) => `@${id}`).join(", ") || "no cards"}): ${t.counts[k]} of ${t.eligible.size} contributors back it`)
            .join("\n")}`;
        })
        .join("\n")}`
    : "Converge panel: nothing open to converge on.";

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-3 pt-20 sm:p-6 sm:pt-24" role="dialog" aria-modal="true" aria-label="Converge">
      <div className="fixed inset-0 bg-[var(--mk-ink)]/40" onClick={onClose} />
      <div className="mk-hard relative w-full max-w-3xl rounded-[6px] bg-white">
        <div className="flex items-center gap-2 border-b border-[var(--mk-ink)] px-3 py-1.5">
          <span className="flex gap-1" aria-hidden>
            <span className="h-2 w-2 bg-[var(--mk-ink)]" />
            <span className="h-2 w-2 bg-[#868896]" />
            <span className="h-2 w-2 bg-[#c2c4cc]" />
          </span>
          <span className="truncate text-[10.5px] font-semibold uppercase tracking-[0.09em]">
            converge://{scopeName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}
          </span>
          <button
            onClick={() => analyse("fresh")}
            disabled={analysing}
            className="ml-auto grid h-7 w-7 place-items-center rounded-[4px] border border-[var(--mk-ink)] hover:bg-[var(--mk-indigo-soft)] disabled:opacity-50"
            aria-label="Read the space again"
            title="Read the space again (points with votes or a timer are kept)"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${analysing ? "animate-spin motion-reduce:animate-none" : ""}`} />
          </button>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-[4px] border border-[var(--mk-ink)] hover:bg-[var(--mk-indigo-soft)]" aria-label="Close">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="p-5 sm:p-7">
          <p className="mk-bit flex items-center gap-2 text-[var(--mk-indigo)]">
            <span aria-hidden className="inline-block h-2 w-2 bg-[var(--mk-indigo)]" />
            Converge
          </p>
          <h2 className="mt-3 text-[1.6rem] font-bold leading-tight tracking-[-0.035em]">
            {phase ? `Converging in ${phase}` : "Where this space needs to converge"}
          </h2>
          <p className="mt-2 max-w-xl text-[14.5px] leading-relaxed tracking-tight text-[var(--mk-ink-2)]">
            Back the position you agree with. Once more than half of the people who contributed to {phase ? "this phase" : "the point's phase"} back one, anyone can draft the convergence card.
          </p>
          {stale && !analysing && (
            <p className="mt-3 text-[12.5px] text-[var(--mk-amber)]">
              Cards have changed since this was read.{" "}
              <button onClick={() => analyse("update")} className="font-semibold underline underline-offset-4">
                Read again
              </button>
            </p>
          )}

          {/* While chatting, the collapsed points bar sticks to the top of the
              panel so the points stay one click away. */}
          <SectionBox
            className={`mt-6 ${view === "chat" ? "sticky top-3 z-20 shadow-[3px_3px_0_var(--mk-ink)]" : ""}`}
            label="Open points"
            hint={analysing ? "Reading the space…" : `${points.length} open`}
            open={view === "points"}
            onToggle={() => setView(view === "points" ? "chat" : "points")}
            scroll={false}
          >
          <div className="p-4 sm:p-5">
          {analysing && (
            <div className="space-y-3" aria-live="polite">
              {[0, 1].map((k) => (
                <div key={k} className="rounded-[5px] border border-[var(--mk-rule)] p-4">
                  <div className="ai-shimmer h-4 w-2/3 rounded-[3px]" />
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="ai-shimmer h-16 rounded-[3px]" />
                    <div className="ai-shimmer h-16 rounded-[3px]" />
                  </div>
                </div>
              ))}
              <p className="text-[12.5px] text-[var(--mk-ink-2)]">Reading every card for where the discussion splits…</p>
            </div>
          )}

          {error && !analysing && (
            <div className="text-[14px] text-[var(--mk-amber)]">
              {error}{" "}
              <button onClick={() => analyse("update")} className="font-semibold underline underline-offset-4">
                Try again
              </button>
            </div>
          )}

          {!analysing && points.length === 0 && !error && (
            <p className="text-[14.5px] text-[var(--mk-ink-2)]">Nothing to converge on here right now.</p>
          )}

          {!analysing && points.length > 0 && (
            <ol className="space-y-5">
              {points.map((point, i) => {
                const t = tallyOf(point);
                const converged = t.winner != null;
                const st = converged ? STATUS.converged : STATUS[point.status] ?? STATUS.open;
                const out = outcomes[point.id];
                const remaining = Math.max(0, t.need - Math.max(...t.counts, 0));
                return (
                  <li key={point.id} className="rounded-[5px] border border-[var(--mk-ink)] p-4 shadow-[2px_2px_0_var(--mk-ink)] sm:p-5">
                    <div className="flex flex-wrap items-start gap-3">
                      <span className="mk-display text-[1.6rem] leading-none text-[var(--mk-indigo)]">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        {!phase && <p className={`${tag} mb-1`}>{point.phase === ACROSS ? "Across phases" : point.phase}</p>}
                        <h3 className="text-[1.05rem] font-bold leading-snug tracking-[-0.025em]">{refs(point.question)}</h3>
                      </div>
                      <span className={`rounded-[3px] border px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.09em] ${st.cls}`}>{st.label}</span>
                    </div>

                    {/* Timer: converge by a deadline. Gone once converged. */}
                    {!converged && (
                      <div className="mt-4">
                        <TimerControl timer={timers[point.id]} onTimer={(op, ms) => timer(point.id, op, ms)} />
                      </div>
                    )}

                    <div className={`mt-4 grid gap-3 ${point.positions.length > 2 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
                      {point.positions.map((pos, k) => {
                        const mine = t.mine === k;
                        const share = t.eligible.size ? t.counts[k] / t.eligible.size : 0;
                        const won = t.winner === k;
                        return (
                          <div
                            key={k}
                            className={`flex flex-col rounded-[4px] border p-3 ${
                              won ? "border-[var(--mk-indigo)] bg-[var(--mk-indigo-soft)]" : mine ? "border-[var(--mk-indigo)]" : "border-[var(--mk-rule)]"
                            }`}
                          >
                            <p className="text-[13.5px] font-semibold leading-snug tracking-tight">{refs(pos.stance)}</p>
                            <p className="mt-1 flex-1 text-[12.5px] leading-snug text-[var(--mk-ink-2)]">{refs(pos.summary)}</p>
                            <div className="mt-2 flex flex-wrap gap-x-2 text-[12px]">
                              {pos.cardIds.map((id) => (
                                <button key={id} onClick={() => jump(id)} className="font-semibold text-[var(--mk-indigo)] hover:underline">
                                  @{id}
                                </button>
                              ))}
                            </div>
                            {/* The vote: a share bar of everyone eligible */}
                            <div className="mt-2.5" title={t.voters[k].length ? t.voters[k].map((u) => `@${u}`).join(", ") : "No votes yet"}>
                              <div className="h-1.5 w-full bg-[var(--mk-rule)]">
                                <div className="h-full bg-[var(--mk-indigo)] transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${Math.round(share * 100)}%` }} />
                              </div>
                              <div className="mt-1.5 flex items-center gap-2">
                                <span className="text-[11.5px] tabular-nums text-[var(--mk-ink-2)]">
                                  {t.counts[k]} of {t.eligible.size}
                                </span>
                                <button
                                  disabled={!t.canVote}
                                  onClick={() => vote(point.id, mine ? null : k)}
                                  className={`ml-auto rounded-[3px] border px-1.5 py-0.5 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
                                    mine ? "border-[var(--mk-indigo)] bg-[var(--mk-indigo)] text-white" : "border-[var(--mk-ink)] bg-white hover:bg-[var(--mk-indigo-soft)]"
                                  }`}
                                  aria-pressed={mine}
                                >
                                  {mine ? "Backed" : "Back this"}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-3 space-y-1 text-[12.5px] leading-snug">
                      {point.missing && !converged && (
                        <p>
                          <span className={tag}>Would settle it </span>
                          {refs(point.missing)}
                        </p>
                      )}
                      <p className="text-[var(--mk-ink-2)]">
                        {converged
                          ? `Converged: ${t.counts[t.winner!]} of ${t.eligible.size} contributors back “${point.positions[t.winner!].stance}”.`
                          : `${t.voted} of ${t.eligible.size} contributors have voted. A position needs ${t.need} to converge${
                              remaining && t.voted ? ` (${remaining} more for the leader)` : ""
                            }.`}
                        {!t.canVote && " Only people who contributed to this phase vote."}
                      </p>
                    </div>

                    {(out === undefined || typeof out === "string") && out !== "loading" && out !== "agenda-loading" && (
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => run(point, "draft")}
                          disabled={!converged}
                          className={`${btn.primary} px-3.5 py-2 text-[13.5px] disabled:cursor-not-allowed`}
                          title={converged ? "Draft the convergence card" : "Unlocks when a position has a majority"}
                        >
                          {converged ? <GitMerge className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                          Draft the convergence card
                        </button>
                        {!converged && (
                          <button onClick={() => run(point, "agenda")} className={`${btn.plain} px-3 py-2 text-[13.5px]`}>
                            <Phone className="h-4 w-4" /> Still split? Plan a 15-min call
                          </button>
                        )}
                        {typeof out === "string" && <span className="text-[12.5px] text-[var(--mk-amber)]">{out}</span>}
                      </div>
                    )}
                    {(out === "loading" || out === "agenda-loading") && (
                      <p className="mt-4 text-[12.5px] text-[var(--mk-ink-2)]">
                        {out === "loading" ? "Drafting the convergence card…" : "Planning a focused call…"}
                      </p>
                    )}

                    {out && typeof out === "object" && (
                      <div className={`mt-4 grid gap-3 ${converged ? "md:grid-cols-[1.4fr_1fr]" : ""}`}>
                        {converged && (
                          <div className="rounded-[4px] border border-[var(--mk-ink)] bg-white p-3.5">
                            <p className="text-[10.5px] font-semibold uppercase tracking-[0.09em]">
                              <span className="text-[var(--mk-indigo)]">
                                {(out.decision.phase && getPhaseById(out.decision.phase)?.name) || "Convergence"}
                              </span>
                              <span className="text-[var(--mk-ink-2)]"> · draft</span>
                            </p>
                            <p className="mt-1.5 text-[14.5px] font-bold leading-snug tracking-[-0.02em]">{refs(out.decision.title)}</p>
                            {out.decision.description && <p className="mt-1 text-[12.5px] italic leading-snug text-[var(--mk-ink-2)]">{refs(out.decision.description)}</p>}
                            {out.decision.text && <p className="mt-1.5 text-[12.5px] leading-snug">{refs(out.decision.text)}</p>}
                            <button
                              onClick={() => {
                                const anchor = anchorOf(out.decision, point);
                                if (anchor != null) onDraft(anchor, out.decision, out.decision.phase);
                              }}
                              className={`${btn.quiet} mt-3 px-3 py-1.5 text-[13px]`}
                            >
                              <PenLine className="h-3.5 w-3.5" /> Draft this card
                            </button>
                          </div>
                        )}
                        {!converged && (
                          <div className="rounded-[4px] border border-dashed border-[var(--mk-ink-2)] bg-[var(--mk-paper)] p-3.5">
                            <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-[var(--mk-ink-2)]">
                              <Phone className="h-3 w-3" /> Still split? 15-min call
                            </p>
                            <p className="mt-1.5 text-[12.5px] font-semibold leading-snug">{refs(out.agenda.goal)}</p>
                            <ol className="mt-1.5 list-decimal space-y-0.5 pl-4 text-[12.5px] leading-snug">
                              {out.agenda.items.map((it, n) => (
                                <li key={n}>{refs(it)}</li>
                              ))}
                            </ol>
                            {out.agenda.prereadCardIds.length > 0 && (
                              <p className="mt-1.5 text-[12px]">
                                <span className={tag}>Read first </span>
                                {out.agenda.prereadCardIds.map((id) => (
                                  <button key={id} onClick={() => jump(id)} className="mr-1.5 font-semibold text-[var(--mk-indigo)] hover:underline">
                                    @{id}
                                  </button>
                                ))}
                              </p>
                            )}
                            <button onClick={() => copyAgenda(point, out.agenda)} className={`${btn.plain} mt-2.5 px-2.5 py-1 text-[12.5px]`}>
                              {copied === point.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                              {copied === point.id ? "Copied" : "Copy agenda"}
                            </button>
                            <CallOutcome
                              layerId={convergence.layerId!}
                              cards={cards}
                              category={category}
                              topic={topic}
                              agenda={out.agenda}
                              question={point.question}
                              onJumpToCard={jump}
                              onDraft={onDraft}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
          </div>
          </SectionBox>

          {/* Ask AI, about the points above or anything else; any reply can become a card */}
          {/* One chat for every point, stuck to the bottom of the panel while
              you scroll the points; scrolling past the chat moves the panel. */}
          <div className={`mt-3 ${view === "points" ? "sticky bottom-3 z-20" : ""}`}>
            <AskAI
              layerId={convergence.layerId}
              box={{
                open: view === "chat",
                onToggle: () => setView(view === "chat" ? "points" : "chat"),
                containScroll: false,
                bodyClassName: "max-h-[50vh]",
                className: "shadow-[3px_3px_0_var(--mk-ink)]",
              }}
              initialScope="space"
              cards={cards}
              category={category}
              topic={topic}
              note={note}
              starters={["Which position does the evidence favour?", "What would change someone's mind?", "Summarise the disagreement fairly"]}
              startersInComposer
              onSend={() => setView("chat")}
              onJumpToCard={jump}
              onDraft={onDraft}
            />
          </div>

          <p className="mt-6 text-[11.5px] text-[var(--mk-ink-2)]">Read from the cards you can see. It can be wrong; check the cards before converging.</p>
        </div>
      </div>
    </div>
  );
}
