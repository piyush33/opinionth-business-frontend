"use client";

// A live walk through "thinking at the point of action", drawn like the real
// space page: Lena's cursor hovers a card, the suggestion panel rises beside
// it (suggested card on top, Ask AI below), and the story runs through
// Converge to a decision card. Plays while on screen; any step can be opened.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUp, Compass, ExternalLink, GitMerge, Lock, Pause, PenLine, Play, RefreshCw, RotateCcw, Shuffle, Sparkles, SquarePlus, Tag, Timer, X, ChevronDown } from "lucide-react";

type Actor = "human" | "space" | "web";
const STEPS: { actor: Actor; text: string; where: string; ms: number }[] = [
  { actor: "human", text: "Lena hovers her claim that event-driven billing makes usage pricing easy. The suggested next card rises beside it.", where: "Card suggestion · Hypothesis", ms: 7600 },
  { actor: "space", text: "She asks why this card. The answer points to Marcus's card 151: provider retries arrive out of order.", where: "Ask AI · This card", ms: 6600 },
  { actor: "web", text: "She switches scope and asks how the provider handles retries. The reply quotes the docs and lists its sources.", where: "Ask AI · Web", ms: 7400 },
  { actor: "human", text: "She stops typing for a while. Marcus's point is stronger than she expected. She doesn't ask the AI what to think.", where: "Nowhere in particular", ms: 5200 },
  { actor: "space", text: "She turns the exchange into a card. It becomes evidence, placed in Discovery, linked to 142 and 151.", where: "Turn into card → Draft", ms: 6200 },
  { actor: "space", text: "The next reading of the space marks \"event-driven or patch the sync pipeline?\" as split, with the cards behind each side.", where: "Converge · Hypothesis", ms: 6400 },
  { actor: "human", text: "A two-day timer goes on the point. Lena backs event-driven; the other three back \"patch with idempotency keys\", and it converges.", where: "Converge · votes and timer", ms: 7000 },
  { actor: "space", text: "The convergence card says \"Backed by 3 of 4\", names Lena's dissent, and places itself in Decision.", where: "Convergence card", ms: 7200 },
];

const ACTOR: Record<Actor, { label: string; cls: string }> = {
  human: { label: "Human", cls: "text-[#f0a45c]" },
  space: { label: "AI · Space", cls: "text-[var(--mk-indigo-bright)]" },
  web: { label: "AI · Web", cls: "text-[#8fe3f3]" },
};

// Where the cursor goes, and when it clicks. Targets are `data-t` names in
// the scene, or fixed points.
type Way = { at: number; to?: string; click?: boolean };
const WAYS: Way[][] = [
  [{ at: 0, to: "rest" }, { at: 2100, to: "card142" }, { at: 5300, to: "sugTitle" }],
  [{ at: 0, to: "sugTitle" }, { at: 250, to: "askInput" }, { at: 900, click: true }, { at: 1950, to: "send" }, { at: 2400, click: true }, { at: 5000, to: "ref151" }],
  [{ at: 0, to: "ref151" }, { at: 250, to: "scopeWeb" }, { at: 800, click: true }, { at: 1000, to: "askInput" }, { at: 1250, click: true }, { at: 2850, to: "send" }, { at: 3200, click: true }, { at: 6100, to: "source1" }],
  [{ at: 0, to: "source1" }, { at: 700, to: "idle1" }, { at: 2500, to: "idle2" }],
  [{ at: 0, to: "idle2" }, { at: 250, to: "turnInto" }, { at: 900, click: true }, { at: 3000, to: "draftPreview" }, { at: 3600, click: true }, { at: 4600, to: "newCard" }],
  [{ at: 0, to: "newCard" }, { at: 300, to: "convergeBtn" }, { at: 1000, click: true }, { at: 3300, to: "posA" }, { at: 4700, to: "posB" }],
  [{ at: 0, to: "posB" }, { at: 250, to: "setTimer" }, { at: 850, click: true }, { at: 1100, to: "t2d" }, { at: 1600, click: true }, { at: 2100, to: "backA" }, { at: 2600, click: true }, { at: 5800, to: "draftConv" }],
  [{ at: 0, to: "draftConv" }, { at: 600, click: true }, { at: 3300, to: "useCard" }, { at: 3900, click: true }, { at: 5200, to: "decisionCard" }],
];
const FIXED: Record<string, [number, number]> = { rest: [600, 430], idle1: [500, 300], idle2: [470, 318] };

const W = 660;
const H = 470;

const Q1 = "Why this card?";
const A1 = "Your claim assumes usage events arrive in order. Marcus's card #151 says the provider retries them out of order, so the next thing this phase needs is evidence either way.";
const Q2 = "How does the provider handle retries?";
const A2 = "Webhooks are delivered at least once and can arrive out of order after a retry. The docs recommend an idempotency key on every event.";

/** Reveal `text` from `start` at `cps` characters a second. */
const typed = (text: string, t: number, start: number, cps = 75) => {
  const n = Math.max(0, Math.floor(((t - start) / 1000) * cps));
  return n >= text.length ? text : text.slice(0, n);
};

/** Card references (#151) in the indigo link style the app uses. */
function Refs({ text, t: tag }: { text: string; t?: string }) {
  const parts = text.split(/(#\d+)/);
  return (
    <>
      {parts.map((p, k) =>
        /^#\d+$/.test(p) ? (
          <span key={k} data-t={tag && k === 1 ? tag : undefined} className="font-semibold text-[var(--mk-indigo)] underline decoration-[var(--mk-indigo)]/40 underline-offset-2">
            {p}
          </span>
        ) : (
          <span key={k}>{p}</span>
        ),
      )}
    </>
  );
}

function Dots() {
  return (
    <span className="ai-dots" aria-hidden>
      <i />
      <i />
      <i />
    </span>
  );
}

function MiniCard({
  id,
  who,
  phase,
  role,
  title,
  desc,
  hover = false,
  fresh = false,
  dataT,
}: {
  id: number | string;
  who: string;
  phase: string;
  role: string;
  title: string;
  desc: string;
  hover?: boolean;
  fresh?: boolean;
  dataT?: string;
}) {
  return (
    <div data-t={dataT} className="relative h-full">
      {/* Stacked sheets behind the card, like the real hover */}
      {[3, 2, 1].map((n) => (
        <span
          key={n}
          aria-hidden
          className="absolute inset-0 rounded-[5px] border border-[var(--mk-paper)] bg-[var(--mk-ink)] transition-transform ease-out"
          style={{ transform: hover ? `translate(${n * 2.5}px, ${n * 2.5}px)` : "none", transitionDuration: `${270 + n * 100}ms` }}
        />
      ))}
      <div
        className={`relative z-[4] flex h-full flex-col rounded-[5px] border bg-white px-3 pb-2.5 pt-3 transition-[transform,box-shadow,border-color] duration-500 ease-out ${
          hover ? "-translate-x-[2px] -translate-y-[2px] border-[var(--mk-ink)]" : fresh ? "border-[var(--mk-cyan)] shadow-[3px_3px_0_var(--mk-cyan)]" : "border-[var(--mk-ink)]"
        }`}
      >
        <p className="text-[8.5px] font-semibold uppercase leading-[1.5] tracking-[0.1em]">
          <span className="text-[var(--mk-indigo)]">{phase}</span>
          <span className="text-[var(--mk-rule)]"> · </span>
          <span className="text-[var(--mk-cyan)]">{role}</span>
        </p>
        <p className={`mt-1.5 text-[12.5px] font-bold leading-[1.22] tracking-[-0.03em] transition-colors ${hover ? "text-[var(--mk-indigo)]" : ""}`}>{title}</p>
        <p className="mt-1 line-clamp-2 text-[10.5px] italic leading-[1.45] text-[var(--mk-ink-2)]">{desc}</p>
        <div className="mt-auto flex items-center gap-1.5 border-t border-[var(--mk-rule)] pt-2 text-[10px] text-[var(--mk-ink-2)]">
          <span className="grid h-4 w-4 place-items-center rounded-[3px] bg-[var(--mk-indigo)] text-[8px] font-bold text-white">{who[0]}</span>
          <span className="font-semibold text-[var(--mk-ink)]">{who}</span>
          <span className="tabular-nums">· No. {id}</span>
        </div>
      </div>
    </div>
  );
}

function PhaseHead({ n, name, count, converge, dataT }: { n: number; name: string; count: number; converge?: boolean; dataT?: string }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-[var(--mk-ink)] pb-2">
      <span className="mk-pixel text-[10px] text-[var(--mk-indigo)]">
        §{n} {name}
      </span>
      {converge && (
        <span data-t={dataT} className="inline-flex items-center gap-1 rounded-[4px] border border-[var(--mk-ink)] bg-white px-2 py-0.5 text-[10.5px] font-semibold shadow-[2px_2px_0_var(--mk-ink)]">
          <GitMerge className="h-3 w-3 text-[var(--mk-indigo)]" /> Converge <span className="text-[var(--mk-indigo)]">1</span>
        </span>
      )}
      <span className="ml-auto text-[10px] font-semibold tabular-nums text-[var(--mk-ink-2)]">
        {count} {count === 1 ? "card" : "cards"}
      </span>
    </div>
  );
}

/** Everything on screen at step `i`, `t` ms in. */
function Scene({ i, t }: { i: number; t: number }) {
  const past = (step: number, ms = 0) => i > step || (i === step && t >= ms);
  const within = (from: [number, number], to: [number, number]) => past(...from) && !past(...to);

  // Space page
  const decision = past(7, 4300);
  const newCard = past(4, 3900);
  const hover142 = within([0, 900], [4, 3700]);

  // Suggestion panel
  const panel = within([0, 1300], [4, 3700]);
  const panelReady = past(0, 2400);
  const askOpen = past(1, 900);
  const web = past(2, 800);
  let input = "";
  if (i === 1 && t >= 1100 && t < 2400) input = typed(Q1, t, 1100, 22);
  if (i === 2 && t >= 1400 && t < 3200) input = typed(Q2, t, 1400, 28);
  const caret = (i === 1 && t > 900 && t < 2400) || (i === 2 && t > 1250 && t < 3200) || i === 3;

  type Msg = { k: string; node: React.ReactNode };
  const msgs: Msg[] = [];
  if (past(1, 2400)) msgs.push({ k: "q1", node: <p className="ml-8 rounded-[4px] bg-[var(--mk-ink)] px-2.5 py-1.5 text-[11.5px] leading-snug text-white">{Q1}</p> });
  if (past(1, 3200))
    msgs.push({
      k: "a1",
      node: (
        <div>
          <p className="mb-1 text-[8.5px] font-semibold uppercase tracking-[0.09em] text-[var(--mk-indigo)]">This card</p>
          <p className="text-[11.5px] leading-relaxed">
            <Refs text={i === 1 ? typed(A1, t, 3200, 95) : A1} t="ref151" />
          </p>
        </div>
      ),
    });
  if (past(2, 3200)) msgs.push({ k: "q2", node: <p className="ml-8 rounded-[4px] bg-[var(--mk-ink)] px-2.5 py-1.5 text-[11.5px] leading-snug text-white">{Q2}</p> });
  if (past(2, 4300))
    msgs.push({
      k: "a2",
      node: (
        <div>
          <p className="mb-1 text-[8.5px] font-semibold uppercase tracking-[0.09em] text-[var(--mk-indigo)]">Web</p>
          <p className="text-[11.5px] leading-relaxed">{i === 2 ? typed(A2, t, 4300, 95) : A2}</p>
          <ul
            className={`mt-1.5 space-y-0.5 border-l-2 border-[var(--mk-cyan)] pl-2 transition-opacity duration-500 ${past(2, 5900) ? "opacity-100" : "opacity-0"}`}
          >
            <li className="text-[8.5px] font-semibold uppercase tracking-[0.09em] text-[var(--mk-ink-2)]">Sources</li>
            <li data-t="source1" className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[var(--mk-cyan-deep)]">
              <ExternalLink className="h-2.5 w-2.5" /> Provider docs · Webhook retries
            </li>
            <li className="flex items-center gap-1 text-[10.5px] font-semibold text-[var(--mk-cyan-deep)]">
              <ExternalLink className="h-2.5 w-2.5" /> Provider docs · Idempotent requests
            </li>
          </ul>
          {past(2, 5900) && (
            <span data-t="turnInto" className={`mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--mk-indigo)] ${within([4, 900], [4, 1000]) ? "underline" : ""}`}>
              <SquarePlus className="h-3 w-3" /> Turn into card
            </span>
          )}
        </div>
      ),
    });
  if (past(4, 1800))
    msgs.push({
      k: "card",
      node: (
        <div className="ai-fade-in rounded-[4px] border border-[var(--mk-ink)] bg-white p-2.5 shadow-[2px_2px_0_var(--mk-ink)]">
          <p className="mb-1 text-[8.5px] font-semibold uppercase tracking-[0.09em]">
            <span className="text-[var(--mk-indigo)]">Discovery</span>
            <span className="text-[var(--mk-cyan)]"> · Evidence</span>
          </p>
          <p className="text-[12px] font-bold leading-snug tracking-[-0.02em]">Provider retries arrive out of order</p>
          <p className="mt-0.5 text-[10.5px] italic leading-snug text-[var(--mk-ink-2)]">
            <Refs text="So usage events need idempotency keys. Builds on #142 and #151." />
          </p>
          <span data-t="draftPreview" className="mk-btn mt-2 inline-flex items-center gap-1 rounded-[4px] bg-[var(--mk-indigo-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--mk-indigo-deep)]">
            <PenLine className="h-3 w-3" /> Draft this card
          </span>
        </div>
      ),
    });
  const thinking = within([1, 2400], [1, 3200]) || within([2, 3200], [2, 4300]) || within([4, 900], [4, 1800]);

  // Converge
  const modal = within([5, 1100], [7, 4000]);
  const modalReady = past(5, 2500);
  const picking = within([6, 850], [6, 1600]);
  const timer = past(6, 1600);
  const votesA = past(6, 2600) ? 1 : 0;
  const votesB = past(6, 4500) ? 3 : past(6, 4000) ? 2 : past(6, 3500) ? 1 : 0;
  const mine = votesA > 0;
  const converged = past(6, 4800);
  const convLoading = within([7, 600], [7, 1500]);
  const convCard = past(7, 1500);
  const timeLeft = (() => {
    if (!timer) return "";
    const left = 2 * 86400 - Math.floor((i === 6 ? t - 1600 : 3000) / 1000) * 60;
    const d = Math.floor(left / 86400);
    const h = Math.floor((left % 86400) / 3600);
    const m = Math.floor((left % 3600) / 60);
    return `${d}d ${h}h ${String(m).padStart(2, "0")}m left`;
  })();

  const POS = [
    { stance: "Move billing to event-driven", sum: "Events make usage pricing a stream, not a batch.", refs: "#142 #148", votes: votesA, dt: "posA" },
    { stance: "Patch the sync pipeline with idempotency keys", sum: "Fixes the retry problem without a rebuild.", refs: "#151 #163", votes: votesB, dt: "posB" },
  ];

  return (
    <div className="relative h-full w-full overflow-hidden bg-[var(--mk-paper)] text-[var(--mk-ink)]">
      {/* Top bar */}
      <div className="flex h-[38px] items-center gap-2.5 border-b border-[var(--mk-ink)] bg-white px-4">
        <span className="inline-flex items-center gap-1 rounded-[4px] border border-[var(--mk-ink)] px-1.5 py-0.5 text-[10px] font-semibold">
          <ArrowLeft className="h-3 w-3" /> Back
        </span>
        <span className="text-[14px] font-bold tracking-[-0.03em]">Billing rework</span>
        <span className="ml-auto inline-flex items-center gap-1 rounded-[4px] border border-[var(--mk-ink)] bg-white px-2 py-0.5 text-[10.5px] font-semibold shadow-[2px_2px_0_var(--mk-ink)]">
          <Sparkles className="h-3 w-3 text-[var(--mk-indigo)]" /> Summary
        </span>
      </div>

      {/* Page, newest phase first */}
      <div className="px-4 pt-3">
        <div
          className="overflow-hidden transition-[max-height,opacity] duration-700 ease-out"
          style={{ maxHeight: decision ? 200 : 0, opacity: decision ? 1 : 0 }}
        >
          <PhaseHead n={3} name="Decision" count={1} />
          <div className="grid grid-cols-3 gap-3 pb-4 pt-3">
            <div className="h-[128px]">
              <MiniCard
                id={171}
                who="Anika"
                phase="Decision"
                role="Convergence"
                title="Patch the sync pipeline with idempotency keys"
                desc="Backed by 3 of 4 contributors. Lena's dissent: event-driven is cleaner long term."
                fresh
                dataT="decisionCard"
              />
            </div>
          </div>
        </div>

        <PhaseHead n={2} name="Hypothesis" count={3} converge={past(5, 0)} dataT="convergeBtn" />
        <div className="grid grid-cols-3 gap-3 pb-4 pt-3">
          {[
            { id: 142, who: "Lena", role: "Claim", title: "Event-driven billing makes usage pricing easy", desc: "Every usage event flows straight into the invoice, no nightly batch.", dataT: "card142", hover: hover142 },
            { id: 148, who: "Priya", role: "Support", title: "Streaming fits per-seat and per-call pricing", desc: "Both models become a sum over events." },
            { id: 163, who: "Marcus", role: "Counter", title: "A rebuild is a quarter we don't have", desc: "Patching the sync pipeline ships this month." },
          ].map((c) => (
            <div key={c.id} className="h-[128px]">
              <MiniCard phase="Hypothesis" {...c} />
            </div>
          ))}
        </div>

        <PhaseHead n={1} name="Discovery" count={newCard ? 2 : 1} />
        <div className="grid grid-cols-3 gap-3 pt-3">
          <div className="h-[128px]">
            <MiniCard id={151} who="Marcus" phase="Discovery" role="Evidence" title="Provider retries arrive out of order" desc="Seen in last month's sync logs: retried events land after newer ones." />
          </div>
          <div
            className="h-[128px] transition-all duration-500 ease-out"
            style={{ opacity: newCard ? 1 : 0, transform: newCard ? "none" : "translateY(8px) scale(0.97)" }}
          >
            <MiniCard
              id={170}
              who="Lena"
              phase="Discovery"
              role="Evidence"
              title="Retries need idempotency keys"
              desc="Builds on #142 and #151: the provider can retry out of order."
              fresh={newCard && !past(5, 0)}
              dataT="newCard"
            />
          </div>
        </div>
      </div>

      {/* Suggestion panel, beside the hovered card */}
      <div
        className="absolute z-20 flex flex-col overflow-hidden rounded-[6px] border border-[var(--mk-ink)] bg-white shadow-[4px_4px_0_var(--mk-ink)] transition-[opacity,transform] duration-500"
        style={{
          left: 238,
          top: 46,
          width: 404,
          height: 412,
          opacity: panel ? 1 : 0,
          transform: panel ? "none" : "translateY(10px)",
          transitionTimingFunction: "cubic-bezier(0.2, 0.8, 0.2, 1)",
          pointerEvents: "none",
        }}
      >
        <div className="flex shrink-0 items-center gap-2.5 p-3 pb-2">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[4px] border border-[var(--mk-ink)] bg-[var(--mk-indigo-soft)]">
            <Sparkles className="h-3.5 w-3.5 text-[var(--mk-indigo)]" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[12.5px] font-semibold">Suggested next card</span>
              <span className="rounded-[3px] border border-[var(--mk-indigo)] px-1 py-px text-[8.5px] font-semibold uppercase tracking-[0.09em] text-[var(--mk-indigo)]">Evidence</span>
            </div>
            <div className="text-[10.5px] text-[var(--mk-ink-2)]">Hypothesis</div>
          </div>
          <span className="grid h-7 w-7 place-items-center rounded-[4px] border border-[var(--mk-ink)]">
            <X className="h-3.5 w-3.5" />
          </span>
        </div>

        {!panelReady ? (
          <div className="space-y-2 px-3 pt-1">
            <div className="animate-pulse bg-[var(--mk-rule)] h-2.5 w-full rounded-[3px]" />
            <div className="animate-pulse bg-[var(--mk-rule)] h-2.5 w-11/12 rounded-[3px]" />
            <div className="animate-pulse bg-[var(--mk-rule)] h-2.5 w-3/4 rounded-[3px]" />
            <div className="flex items-center gap-2 pt-1 text-[10.5px] text-[var(--mk-ink-2)]">
              <Dots /> Reading the space…
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-2 px-2.5 pb-2.5">
            {/* Suggested card box */}
            <section
              className="flex min-h-0 flex-col overflow-hidden rounded-[5px] border border-[var(--mk-ink)] bg-white transition-[flex-grow,box-shadow] duration-500 ease-out"
              style={{ flexGrow: askOpen ? 0.0001 : 1, flexBasis: 0, minHeight: 34, boxShadow: askOpen ? "none" : "2px 2px 0 var(--mk-ink)" }}
            >
              <div className="flex h-[33px] shrink-0 items-center gap-2 px-2.5">
                <span className="text-[9px] font-semibold uppercase tracking-[0.09em] text-[var(--mk-indigo)]">Suggested card</span>
                <span className={`min-w-0 flex-1 truncate text-[11px] font-semibold transition-opacity duration-300 ${askOpen ? "opacity-100" : "opacity-0"}`}>
                  Do provider retries arrive in order?
                </span>
                <ChevronDown className={`h-3.5 w-3.5 text-[var(--mk-ink-2)] transition-transform duration-500 ${askOpen ? "" : "rotate-180"}`} />
              </div>
              <div className="ai-fade-in min-h-0 flex-1 overflow-hidden border-t border-[var(--mk-rule)]">
                <div className="px-2.5 pt-2.5">
                  <span className="inline-flex items-center gap-1 rounded-[3px] border border-[var(--mk-cyan)] bg-[var(--mk-cyan-soft)] px-1.5 py-px text-[10px] font-semibold text-[var(--mk-cyan-deep)]">
                    <Tag className="h-3 w-3" /> Evidence
                  </span>
                  <h3 data-t="sugTitle" className="mt-2 text-[15px] font-bold leading-tight tracking-[-0.03em]">
                    Do provider retries arrive in order?
                  </h3>
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-[var(--mk-ink-2)]">
                    <Refs text="The claim in #142 depends on it, and #151 suggests they don't. One check settles which way this phase goes." />
                  </p>
                  <div className="mt-2 flex gap-2 border-l-2 border-[var(--mk-indigo)] bg-[var(--mk-indigo-soft)] px-2.5 py-1.5 text-[10.5px] leading-relaxed">
                    <Compass className="mt-0.5 h-3 w-3 shrink-0 text-[var(--mk-indigo)]" />
                    Hypothesis has a claim and a counter, but no evidence yet.
                  </div>
                </div>
              </div>
              <div className="shrink-0 border-t border-[var(--mk-rule)] px-2.5 pb-2 pt-2">
                <div className="flex gap-2">
                  <span className="mk-btn inline-flex flex-1 items-center justify-center gap-1.5 rounded-[4px] bg-[var(--mk-indigo-soft)] px-3 py-1.5 text-[11.5px] font-semibold text-[var(--mk-indigo-deep)]">
                    <PenLine className="h-3.5 w-3.5" /> Draft this card
                  </span>
                  <span className="mk-btn grid h-[30px] w-[30px] place-items-center rounded-[4px] bg-white">
                    <Shuffle className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </section>

            {/* Ask AI box */}
            <section
              className="flex min-h-0 flex-col overflow-hidden rounded-[5px] border border-[var(--mk-ink)] bg-white transition-[flex-grow,box-shadow] duration-500 ease-out"
              style={{ flexGrow: askOpen ? 1 : 0.0001, flexBasis: 0, minHeight: 106, boxShadow: askOpen ? "2px 2px 0 var(--mk-ink)" : "none" }}
            >
              <div className="flex h-[33px] shrink-0 items-center gap-2 px-2.5">
                <Sparkles className="h-3 w-3 text-[var(--mk-indigo)]" />
                <span className="text-[9px] font-semibold uppercase tracking-[0.09em] text-[var(--mk-indigo)]">Ask AI</span>
                <span className={`min-w-0 flex-1 truncate text-[11px] text-[var(--mk-ink-2)] transition-opacity duration-300 ${askOpen ? "opacity-0" : "opacity-100"}`}>Not posted</span>
                <ChevronDown className={`h-3.5 w-3.5 text-[var(--mk-ink-2)] transition-transform duration-500 ${askOpen ? "rotate-180" : ""}`} />
              </div>
              <div
                className="flex min-h-0 flex-1 flex-col justify-end gap-2.5 overflow-hidden border-t border-[var(--mk-rule)] px-3 pb-2.5"
                style={{ maskImage: "linear-gradient(to bottom, transparent 0, #000 28px)", WebkitMaskImage: "linear-gradient(to bottom, transparent 0, #000 28px)" }}
              >
                {msgs.map((m) => (
                  <div key={m.k} className="ai-fade-in shrink-0">
                    {m.node}
                  </div>
                ))}
                {thinking && (
                  <div className="flex shrink-0 items-center gap-2 text-[10.5px] text-[var(--mk-ink-2)]">
                    <Dots /> {web && i === 2 ? "Searching the web…" : "Thinking…"}
                  </div>
                )}
              </div>
              <div className="shrink-0 space-y-1.5 border-t border-[var(--mk-rule)] p-2">
                <div className="flex flex-wrap gap-1">
                  {["This card", "This space", "All spaces", "Web", "General"].map((s) => {
                    const on = s === (web ? "Web" : "This card");
                    return (
                      <span
                        key={s}
                        data-t={s === "Web" ? "scopeWeb" : undefined}
                        className={`rounded-[3px] px-1.5 py-px text-[10px] font-semibold transition-colors duration-300 ${on ? "bg-[var(--mk-ink)] text-white" : "text-[var(--mk-ink-2)]"}`}
                      >
                        {s}
                      </span>
                    );
                  })}
                </div>
                <div className="flex items-center gap-1.5">
                  <div
                    data-t="askInput"
                    data-aim="right"
                    className={`flex h-[28px] min-w-0 flex-1 items-center rounded-[4px] border border-[var(--mk-ink)] bg-white px-2 text-[11.5px] transition-shadow ${caret ? "shadow-[2px_2px_0_var(--mk-indigo)]" : ""}`}
                  >
                    {input ? <span className="truncate">{input}</span> : !caret && <span className="truncate text-[#8a8ea0]">{web ? "Research something on the web…" : "Ask about this card, or ask for a change…"}</span>}
                    {caret && <span className="ml-px h-3.5 w-px animate-[mkBlink_1s_steps(1)_infinite] bg-[var(--mk-ink)]" />}
                  </div>
                  <span data-t="send" className={`grid h-[28px] w-[28px] place-items-center rounded-[4px] bg-[var(--mk-indigo)] text-white transition-opacity ${input ? "" : "opacity-40"}`}>
                    <ArrowUp className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>

      {/* Converge modal */}
      <div className="absolute inset-0 z-30 transition-opacity duration-500" style={{ opacity: modal ? 1 : 0, pointerEvents: "none" }}>
        <div className="absolute inset-0 bg-[var(--mk-ink)]/40" />
        <div
          className="absolute left-[34px] right-[34px] top-[22px] overflow-hidden rounded-[6px] border border-[var(--mk-ink)] bg-white shadow-[4px_4px_0_var(--mk-ink)] transition-transform duration-500"
          style={{ bottom: 18, transform: modal ? "none" : "translateY(12px)" }}
        >
          <div className="relative z-10 flex items-center gap-2 border-b border-[var(--mk-ink)] bg-white px-3 py-1.5">
            <span className="flex gap-1" aria-hidden>
              <span className="h-1.5 w-1.5 bg-[var(--mk-ink)]" />
              <span className="h-1.5 w-1.5 bg-[#868896]" />
              <span className="h-1.5 w-1.5 bg-[#c2c4cc]" />
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.09em]">Converge · Hypothesis</span>
            <span className="ml-auto grid h-6 w-6 place-items-center rounded-[4px] border border-[var(--mk-ink)]">
              <RefreshCw className={`h-3 w-3 ${modal && !modalReady ? "animate-spin" : ""}`} />
            </span>
            <span className="grid h-6 w-6 place-items-center rounded-[4px] border border-[var(--mk-ink)]">
              <X className="h-3 w-3" />
            </span>
          </div>
          <div className="transition-transform duration-700 ease-out" style={{ transform: convLoading || convCard ? "translateY(-196px)" : "none" }}>
            <div className="p-4">
              <p className="mk-bit flex items-center gap-2 text-[var(--mk-indigo)]">
                <span aria-hidden className="inline-block h-1.5 w-1.5 bg-[var(--mk-indigo)]" /> Converge
              </p>
              <h2 className="mt-1.5 text-[17px] font-bold leading-tight tracking-[-0.035em]">Converging in Hypothesis</h2>
              <p className="mt-1 text-[11px] leading-relaxed text-[var(--mk-ink-2)]">
                Back the position you agree with. Once more than half of the people who contributed to this phase back one, anyone can draft the convergence card.
              </p>

              {!modalReady ? (
                <div className="mt-3 rounded-[5px] border border-[var(--mk-rule)] p-3">
                  <div className="animate-pulse bg-[var(--mk-rule)] h-3 w-2/3 rounded-[3px]" />
                  <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                    <div className="animate-pulse bg-[var(--mk-rule)] h-14 rounded-[3px]" />
                    <div className="animate-pulse bg-[var(--mk-rule)] h-14 rounded-[3px]" />
                  </div>
                  <p className="mt-2.5 text-[10.5px] text-[var(--mk-ink-2)]">Reading every card for where the discussion splits…</p>
                </div>
              ) : (
                <div className="ai-fade-in mt-3 rounded-[5px] border border-[var(--mk-ink)] p-3 shadow-[2px_2px_0_var(--mk-ink)]">
                  <div className="flex items-start gap-2.5">
                    <span className="mk-display text-[20px] leading-none text-[var(--mk-indigo)]">1</span>
                    <h3 className="min-w-0 flex-1 text-[13.5px] font-bold leading-snug tracking-[-0.025em]">Event-driven, or patch the sync pipeline?</h3>
                    <span
                      className={`rounded-[3px] border px-1.5 py-px text-[9px] font-semibold uppercase tracking-[0.09em] transition-colors duration-500 ${
                        converged ? "border-[var(--mk-indigo)] bg-[var(--mk-indigo)] text-white" : "border-[var(--mk-amber)] bg-[var(--mk-amber-soft)] text-[var(--mk-amber)]"
                      }`}
                    >
                      {converged ? "Converged" : "Split"}
                    </span>
                  </div>
                  <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                    {POS.map((p, k) => {
                      const win = converged && k === 1;
                      return (
                        <div
                          key={p.dt}
                          data-t={p.dt}
                          className={`flex flex-col rounded-[4px] border p-2.5 transition-colors duration-500 ${win ? "border-[var(--mk-indigo)] bg-[var(--mk-indigo-soft)]/50" : "border-[var(--mk-rule)]"}`}
                        >
                          <p className="text-[11.5px] font-semibold leading-snug">{p.stance}</p>
                          <p className="mt-0.5 flex-1 text-[10.5px] leading-snug text-[var(--mk-ink-2)]">{p.sum}</p>
                          <p className="mt-1 text-[10.5px]">
                            <Refs text={p.refs} />
                          </p>
                          <div className="mt-1.5 h-1 w-full bg-[var(--mk-rule)]">
                            <div className="h-full bg-[var(--mk-indigo)] transition-[width] duration-500" style={{ width: `${(p.votes / 4) * 100}%` }} />
                          </div>
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <span className="text-[10px] tabular-nums text-[var(--mk-ink-2)]">{p.votes} of 4</span>
                            <span
                              data-t={k === 0 ? "backA" : undefined}
                              className={`ml-auto rounded-[3px] border px-1.5 py-px text-[10px] font-semibold transition-colors duration-300 ${
                                k === 0 && mine ? "border-[var(--mk-indigo)] bg-[var(--mk-indigo)] text-white" : "border-[var(--mk-ink)] bg-white"
                              }`}
                            >
                              {k === 0 && mine ? "Backed" : "Back this"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-[10.5px] text-[var(--mk-ink-2)]">
                    {converged
                      ? "Converged: 3 of 4 contributors back “Patch the sync pipeline with idempotency keys”. Lena’s dissent goes on the card."
                      : `${votesA + votesB} of 4 contributors have voted. A position needs 3 to converge.`}
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <span
                      data-t="draftConv"
                      className={`inline-flex items-center gap-1.5 rounded-[4px] border border-[var(--mk-ink)] px-2.5 py-1 text-[11px] font-semibold transition-colors duration-500 ${
                        converged ? "bg-[var(--mk-ink)] text-white shadow-[2px_2px_0_var(--mk-indigo)]" : "bg-[var(--mk-ink)]/50 text-white/80"
                      }`}
                    >
                      {converged ? <GitMerge className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />} Draft the convergence card
                    </span>
                    {!timer && !picking && (
                      <span data-t="setTimer" className="inline-flex items-center gap-1 rounded-[4px] border border-[var(--mk-ink)] bg-white px-2 py-1 text-[11px] font-semibold">
                        <Timer className="h-3.5 w-3.5 text-[var(--mk-indigo)]" /> Set a timer
                      </span>
                    )}
                    {picking && (
                      <span className="ai-fade-in inline-flex items-center gap-1 rounded-[4px] border border-[var(--mk-indigo)] bg-[var(--mk-indigo-soft)] p-1">
                        {["1h", "4h", "24h", "2 days", "3 days"].map((d) => (
                          <span key={d} data-t={d === "2 days" ? "t2d" : undefined} className="rounded-[3px] border border-[var(--mk-ink)] bg-white px-1.5 py-px text-[10px] font-semibold">
                            {d}
                          </span>
                        ))}
                      </span>
                    )}
                    {timer && (
                      <span
                        className="ai-fade-in inline-flex items-center gap-1 rounded-[3px] border border-[var(--mk-indigo)] bg-[var(--mk-indigo-soft)] px-1.5 py-0.5 text-[10.5px] font-semibold tabular-nums text-[var(--mk-indigo-deep)] transition-all duration-500"
                        style={{ opacity: converged ? 0 : 1, transform: converged ? "scale(0.9)" : "none" }}
                      >
                        <Timer className="h-3 w-3" /> {timeLeft}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {convLoading && (
                <div className="mt-3 flex items-center gap-2 text-[10.5px] text-[var(--mk-ink-2)]">
                  <Dots /> Drafting the convergence card…
                </div>
              )}
              {convCard && (
                <div className="ai-fade-in mt-3 rounded-[4px] border border-[var(--mk-ink)] bg-white p-3 shadow-[2px_2px_0_var(--mk-indigo)]">
                  <p className="text-[8.5px] font-semibold uppercase tracking-[0.09em]">
                    <span className="text-[var(--mk-indigo)]">Decision</span>
                    <span className="text-[var(--mk-cyan)]"> · Convergence</span>
                  </p>
                  <p className="mt-1 text-[13px] font-bold leading-snug tracking-[-0.02em]">Patch the sync pipeline with idempotency keys</p>
                  <p
                    className="mt-1.5 inline-flex items-center gap-1 rounded-[3px] bg-[var(--mk-green-soft)] px-1.5 py-px text-[10px] font-semibold text-[var(--mk-green)] transition-opacity duration-500"
                    style={{ opacity: past(7, 2000) ? 1 : 0 }}
                  >
                    Backed by 3 of 4 contributors
                  </p>
                  <p className="mt-1.5 text-[10.5px] italic leading-snug text-[var(--mk-ink-2)] transition-opacity duration-500" style={{ opacity: past(7, 2500) ? 1 : 0 }}>
                    Dissent: Lena holds that event-driven is cleaner long term. Set aside until usage pricing ships.
                  </p>
                  <span data-t="useCard" className="mk-btn mt-2 inline-flex items-center gap-1 rounded-[4px] bg-[var(--mk-indigo-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--mk-indigo-deep)]">
                    <PenLine className="h-3 w-3" /> Draft this card
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// The human moments: the page steps back and the person comes forward.
const INTRO = 1600; // step 1 opens on Lena reading before the hover begins
const MOMENTS = [
  { step: 0, from: 0, to: 1500 },
  { step: 3, from: 250, to: 4800 },
  { step: 6, from: 2950, to: 5700 },
];

// People are warm (amber, the complement of the app's indigo); the AI and
// the space stay cool (indigo and cyan). Sizes are inline so the graphics
// never depend on generated utility classes.
const WARM = { bg: "#fdf1e4", tile: "#fbe3c8", line: "#e0a46a", deep: "#8a4a12" };

function MomentOverlay({ i, t, still }: { i: number; t: number; still: boolean }) {
  const m = MOMENTS.find((x) => x.step === i);
  const on = !!m && !still && t >= m.from && t < m.to;
  const kind = m ? m.step : -1;
  return (
    <div
      aria-hidden
      className="absolute inset-0 z-40 flex items-center justify-center transition-[opacity,backdrop-filter] duration-500 ease-out"
      style={{ opacity: on ? 1 : 0, backdropFilter: on ? "blur(3px)" : "blur(0px)", background: "rgba(243,244,247,0.9)", pointerEvents: "none" }}
    >
      <div
        className="flex flex-col items-center text-center transition-transform duration-700 ease-out"
        style={{ width: 430, padding: "26px 28px 24px", background: WARM.bg, border: `1px solid ${WARM.line}`, transform: on ? "none" : "translateY(8px)" }}
      >
        <div className="flex items-center justify-center" style={{ height: 120, width: "100%" }}>
          {kind === 0 && <ReadingGraphic />}
          {kind === 3 && <ThinkingGraphic />}
          {kind === 6 && <VotingGraphic t={still ? 1e6 : t} />}
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ marginTop: 14, color: WARM.deep }}>
          Human
        </p>
        <p className="text-[22px] font-bold leading-tight tracking-[-0.035em] text-[var(--mk-ink)]" style={{ marginTop: 4 }}>
          {kind === 0 && "Lena reads her claim"}
          {kind === 3 && "Lena is thinking"}
          {kind === 6 && "The team decides"}
        </p>
        <p className="text-[12.5px] leading-snug" style={{ marginTop: 6, maxWidth: 340, color: WARM.deep }}>
          {kind === 0 && "Event-driven billing makes usage pricing easy. Is it still true?"}
          {kind === 3 && "Marcus's point is stronger than she expected. The AI waits; nothing is posted."}
          {kind === 6 && "Only the people who wrote in this phase vote. More than half settles it."}
        </p>
      </div>
    </div>
  );
}

function Avatar({ who, size = 44 }: { who: string; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center font-bold"
      style={{ width: size, height: size, fontSize: size * 0.4, background: WARM.tile, border: `1px solid ${WARM.line}`, color: WARM.deep }}
    >
      {who[0]}
    </span>
  );
}

function ReadingGraphic() {
  return (
    <div className="flex items-center" style={{ gap: 16 }}>
      <Avatar who="Lena" size={48} />
      <div className="relative overflow-hidden border border-[var(--mk-indigo)] bg-white" style={{ width: 124, height: 70, padding: 10 }}>
        <span className="block bg-[var(--mk-indigo-soft)]" style={{ height: 6, width: "50%" }} />
        <span className="block bg-[var(--mk-rule)]" style={{ height: 8, width: "100%", marginTop: 8 }} />
        <span className="block bg-[var(--mk-rule)]" style={{ height: 8, width: "80%", marginTop: 6 }} />
        <span className="block bg-[#eceef3]" style={{ height: 6, width: "60%", marginTop: 8 }} />
        <span className="absolute inset-x-0" style={{ height: 18, top: 0, background: "rgba(251,227,200,0.75)", mixBlendMode: "multiply", animation: "mkScan 1.6s ease-in-out infinite" }} />
      </div>
    </div>
  );
}

function ThinkingGraphic() {
  const S = 52;
  return (
    <div className="relative" style={{ width: 200, height: 110 }}>
      {[0, 1, 2].map((k) => (
        <span
          key={k}
          className="absolute"
          style={{ left: 74, top: 29, width: S, height: S, border: `1px solid ${WARM.line}`, animation: `mkRipple 3.2s ${k * 1.05}s ease-out infinite` }}
        />
      ))}
      <span className="absolute" style={{ left: 74, top: 29 }}>
        <Avatar who="Lena" size={S} />
      </span>
      {[
        { l: 132, t: 26, w: 7, h: 7, d: 0 },
        { l: 140, t: 12, w: 11, h: 11, d: 0.2 },
      ].map((b, k) => (
        <span key={k} className="absolute bg-white" style={{ left: b.l, top: b.t, width: b.w, height: b.h, border: `1px solid ${WARM.line}`, animation: `mkFloat 2.6s ${b.d}s ease-in-out infinite` }} />
      ))}
      <span
        className="absolute flex items-center bg-white"
        style={{ left: 148, top: -14, height: 26, gap: 4, padding: "0 9px", border: `1px solid ${WARM.line}`, animation: "mkFloat 2.6s 0.4s ease-in-out infinite" }}
      >
        {[0, 1, 2].map((k) => (
          <i key={k} style={{ width: 5, height: 5, background: WARM.deep, animation: `mkDot 1.2s ${k * 0.2}s ease-in-out infinite` }} />
        ))}
      </span>
    </div>
  );
}

function VotingGraphic({ t }: { t: number }) {
  const voters = [
    { who: "Lena", side: "A", at: 0 },
    { who: "Priya", side: "B", at: 3500 },
    { who: "Marcus", side: "B", at: 4000 },
    { who: "Anika", side: "B", at: 4500 },
  ];
  const b = voters.filter((v) => v.side === "B" && t >= v.at).length;
  const done = t >= 4800;
  const SIDE = {
    A: { bg: "var(--mk-cyan-soft)", line: "var(--mk-cyan)", ink: "var(--mk-cyan-deep)", label: "Event-driven" },
    B: { bg: "var(--mk-indigo-soft)", line: "var(--mk-indigo)", ink: "var(--mk-indigo-deep)", label: "Patch" },
  } as const;
  return (
    <div style={{ width: 370 }}>
      <div className="flex justify-center" style={{ gap: 8 }}>
        {voters.map((v) => {
          const voted = t >= v.at;
          const c = SIDE[v.side as "A" | "B"];
          return (
            <div key={v.who} className="flex flex-col items-center" style={{ width: 84 }}>
              <div className="relative">
                <Avatar who={v.who} size={40} />
                <span
                  className="absolute flex items-center justify-center text-[10px] font-bold transition-all duration-300"
                  style={{ right: -7, bottom: -7, width: 18, height: 18, background: c.bg, border: `1px solid ${c.line}`, color: c.ink, opacity: voted ? 1 : 0, transform: voted ? "scale(1)" : "scale(0.4)" }}
                >
                  ✓
                </span>
              </div>
              <span className="text-[11px] font-semibold text-[var(--mk-ink)]" style={{ marginTop: 9 }}>
                {v.who}
              </span>
              <span
                className="whitespace-nowrap text-[9.5px] font-semibold transition-all duration-300"
                style={{
                  marginTop: 4,
                  padding: "1px 6px",
                  background: voted ? c.bg : "#fff",
                  border: voted ? `1px solid ${c.line}` : "1px dashed var(--mk-rule)",
                  color: voted ? c.ink : "var(--mk-ink-2)",
                }}
              >
                {voted ? c.label : "…"}
              </span>
            </div>
          );
        })}
      </div>
      <div className="relative mx-auto bg-white" style={{ marginTop: 14, height: 8, width: 290, border: "1px solid var(--mk-indigo)" }}>
        <div className="h-full transition-[width,background-color] duration-500 ease-out" style={{ width: `${(b / 4) * 100}%`, background: done ? "var(--mk-indigo)" : "var(--mk-indigo-soft)" }} />
        <span className="absolute bg-[var(--mk-ink)]" style={{ left: "75%", top: -5, height: 16, width: 1 }} />
      </div>
    </div>
  );
}

export default function PointOfActionDemo() {
  const [i, setI] = useState(0);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(false);
  const [still, setStill] = useState(false);
  const [scale, setScale] = useState(1);
  const root = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const cursor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStill(true);
      setPlaying(false);
    }
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.3 });
    if (root.current) io.observe(root.current);
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / W));
    if (frame.current) ro.observe(frame.current);
    return () => {
      io.disconnect();
      ro.disconnect();
    };
  }, []);

  const running = playing && visible;
  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      setT((x) => x + dt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  useEffect(() => {
    if (t >= STEPS[i].ms) {
      setI((x) => (x + 1) % STEPS.length);
      setT(0);
    }
  }, [t, i]);

  const shownT = still ? 1e6 : t;

  // Move the cursor to its current target (measured, so it lands on the
  // real element wherever the layout put it).
  const ways = WAYS[i];
  const cur = [...ways].reverse().find((w) => w.to && w.at <= shownT);
  const target = cur?.to ?? ways[0].to!;
  // The name tag shows while the cursor travels, then gets out of the way.
  const tagOn = !cur || shownT - cur.at < 1300;
  const clicking = ways.some((w) => w.click && shownT >= w.at && shownT < w.at + 240);
  const moment = !still && MOMENTS.some((m) => m.step === i && shownT >= m.from && shownT < m.to);
  useLayoutEffect(() => {
    const c = canvas.current;
    const el = cursor.current;
    if (!c || !el) return;
    let x: number;
    let y: number;
    if (FIXED[target]) [x, y] = FIXED[target];
    else {
      const node = c.querySelector<HTMLElement>(`[data-t="${target}"]`);
      if (!node) return;
      const a = c.getBoundingClientRect();
      const b = node.getBoundingClientRect();
      x = (node.dataset.aim === "right" ? b.right - a.left - 26 : b.left - a.left + Math.min(b.width / 2, 60)) / scale;
      y = (b.top - a.top + b.height / 2) / scale;
    }
    el.style.transform = `translate(${x}px, ${y}px)`;
  });

  // The element under a click gives a little, like a real button.
  useLayoutEffect(() => {
    const node = canvas.current?.querySelector<HTMLElement>(`[data-t="${target}"]`);
    if (!node) return;
    node.style.transition = "transform 140ms ease-out, filter 140ms ease-out";
    node.style.transform = clicking ? "translate(1px, 1px) scale(0.97)" : "";
    node.style.filter = clicking ? "brightness(0.96)" : "";
  }, [clicking, target]);

  const go = (k: number) => {
    setI(k);
    setT(0);
  };

  return (
    <div ref={root} className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
      {/* Steps */}
      <ol className="order-2 grid gap-1.5 lg:order-1">
        {STEPS.map((s, k) => {
          const on = k === i;
          return (
            <li key={k}>
              <button
                onClick={() => go(k)}
                aria-current={on ? "step" : undefined}
                className={`relative grid w-full grid-cols-[1.1rem_4.6rem_1fr] items-start gap-2 overflow-hidden border px-3 py-2.5 text-left transition-colors duration-300 ${
                  on ? "border-[#8fe3f3]/70 bg-black/40" : "border-white/10 bg-black/20 hover:border-white/30"
                }`}
              >
                <span className={`text-[13px] font-bold tabular-nums ${on ? "text-white" : "text-white/40"}`}>{k + 1}</span>
                <span className={`mk-pixel pt-0.5 text-[9px] ${ACTOR[s.actor].cls} ${on ? "" : "opacity-60"}`}>{ACTOR[s.actor].label}</span>
                <span>
                  <span
                    className={`block text-[13px] leading-snug tracking-tight ${on ? "text-white" : "text-white/55"}`}
                  >
                    {s.text}
                  </span>
                  {on && <span className="mt-1 block text-[11.5px] text-white/45">{s.where}</span>}
                </span>
                {on && !still && (
                  <span aria-hidden className="absolute bottom-0 left-0 h-[2px] bg-[#8fe3f3]" style={{ width: `${Math.min(100, (t / s.ms) * 100)}%` }} />
                )}
              </button>
            </li>
          );
        })}
      </ol>

      {/* The space, live */}
      <div className="order-1 lg:order-2">
        <div className="overflow-hidden rounded-[6px] border border-white/30 shadow-[5px_5px_0_#8fe3f3]">
          <div ref={frame} className="relative w-full" style={{ height: H * scale }} aria-label="Animated walkthrough of a Collabrr space" role="img">
            <div ref={canvas} className="absolute left-0 top-0 origin-top-left" style={{ width: W, height: H, transform: `scale(${scale})` }}>
              <Scene i={i} t={i === 0 && !still ? shownT - INTRO : shownT} />
              <MomentOverlay i={i} t={shownT} still={still} />
              {/* Lena's cursor: a soft neon triangle */}
              <div
                ref={cursor}
                aria-hidden
                className={`pointer-events-none absolute left-0 top-0 z-50 ${still ? "hidden" : ""}`}
                style={{ transition: "transform 750ms cubic-bezier(0.45, 0.05, 0.2, 1)", transform: `translate(${FIXED.rest[0]}px, ${FIXED.rest[1]}px)` }}
              >
                <div className="transition-opacity duration-500" style={{ opacity: moment ? 0 : 1 }}>
                  <span
                    className="absolute -left-[13px] -top-[13px] h-[26px] w-[26px] border border-[#e0a46a] bg-[#fdf1e4]/80 transition-all duration-300 ease-out"
                    style={{ opacity: clicking ? 1 : 0, transform: clicking ? "scale(1)" : "scale(0.4)" }}
                  />
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 22 22"
                    className="-ml-[3px] -mt-[3px] transition-transform duration-150"
                    style={{
                      transform: clicking ? "scale(0.82)" : "none",
                      filter: "drop-shadow(1px 1px 0 rgba(13,14,24,0.12))",
                    }}
                  >
                    <path d="M4.2 3.4 Q3 2.8 3.3 4.1 L7.6 18.6 Q8 19.9 8.9 18.9 L11.9 13.4 Q12.3 12.7 13 12.6 L18.9 11.6 Q20.2 11.3 19 10.6 Z" fill="#f8cf9f" stroke="#b8702c" strokeWidth="1" strokeLinejoin="round" />
                  </svg>
                  <span
                    className="absolute whitespace-nowrap text-[9px] font-semibold transition-opacity duration-500"
                    style={{ left: 17, top: 19, padding: "0 5px", background: "#fdf1e4", border: "1px solid #e0a46a", color: "#8a4a12", opacity: tagOn ? 1 : 0 }}
                  >
                    Lena
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-white/20 bg-black/40 px-3 py-2 text-[11.5px] text-white/60">
            <span className="truncate">
              Step {i + 1} of {STEPS.length} · {STEPS[i].where}
            </span>
            <span className="flex shrink-0 gap-1">
              {!still && (
                <button onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause" : "Play"} className="rounded-[3px] border border-white/25 p-1 text-white hover:border-white/60">
                  {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                </button>
              )}
              <button onClick={() => go(0)} aria-label="Restart" className="rounded-[3px] border border-white/25 p-1 text-white hover:border-white/60">
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
