// collabrr.io marketing site.
// Story: in 1968 Douglas Engelbart showed linked ideas on a shared bitmap
// screen. The page borrows that era's dot-matrix and dithering, set crisp,
// with Inter as the one typeface and a pixel face only for small labels.
// Claims with numbers carry their sources in the footer.
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, Plus } from "lucide-react";
import MarketingNav, { Logo } from "./MarketingNav";
import DesignPartnerForm from "./DesignPartnerForm";
import { HeroSpace, LayersDiagram, DecisionFlow, ModesDiagram } from "./Visuals";
import { DitherBand, LinkedCardsScreen, LogoBitmap, PixelIcon } from "./Bitmap";

const wrap = "mx-auto w-full max-w-6xl px-4 sm:px-6";
const h2 = "mk-display text-[2.4rem] sm:text-[3.4rem]";
const lede = "text-[17px] leading-[1.6] tracking-[-0.01em] text-[var(--mk-ink-2)] sm:text-[18px]";

function Label({ children, tone = "ink" }: { children: React.ReactNode; tone?: "ink" | "light" }) {
  return (
    <p className={`mk-bit flex items-center gap-2 ${tone === "light" ? "text-[#8fe3f3]" : "text-[var(--mk-indigo)]"}`}>
      <span aria-hidden className={`inline-block h-2 w-2 ${tone === "light" ? "bg-[#8fe3f3]" : "bg-[var(--mk-indigo)]"}`} />
      {children}
    </p>
  );
}

function Section({ id, children, className = "" }: { id?: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={`scroll-mt-16 py-20 sm:py-28 ${className}`}>
      <div className={wrap}>{children}</div>
    </section>
  );
}

const PILLARS = [
  {
    icon: "chat" as const,
    title: "Complex discussions, asynchronously",
    body: "Long, multi-branch discussions get a space of their own. People research before they reply, contribute when they think best, and nobody has to take the 6 a.m. call.",
  },
  {
    icon: "clock" as const,
    title: "Context that survives",
    body: "Join hours or months late and see where the argument stands: what's settled, what's contested, what's still open, and why. New hires read the why, not just the what.",
  },
  {
    icon: "network" as const,
    title: "Cross-department osmosis",
    body: "Product, design, engineering and business add their angle as linked cards in the same space. Insights reach the teams that need them instead of dying in one channel.",
  },
  {
    icon: "scale" as const,
    title: "Decision intelligence",
    body: "Every decision keeps its trace: the question, the options, the evidence, the objections and the rationale. Your organisation builds a memory of how it decides.",
  },
];

const PRIMITIVES = [
  {
    k: "Spaces",
    t: "One space per hard question",
    d: "A social whiteboard for an architecture choice, a pricing model or a launch. Anyone can enter through any card; no single opening post owns the frame.",
  },
  {
    k: "Cards",
    t: "Each card does one job",
    d: "Question, claim, counter-claim, evidence, assumption, risk, mitigation, experiment, decision rationale. Writing one thing at a time makes reasoning precise and easy to challenge.",
  },
  {
    k: "Phases",
    t: "A visible arc from question to decision",
    d: "Seed, discovery, hypothesis, specs, decision, execution, documentation and retro. You can always see where an idea stands and how it got there.",
  },
  {
    k: "Links",
    t: "Arguments stay connected",
    d: "Cards cite each other with @id, so a counter-claim names the claim it answers and a decision cites what shaped it. The trace builds itself as you work.",
  },
];

const USE_CASES = [
  { t: "Product discovery and development", d: "Customer problems → opportunities → ideas → requirements → alternatives → trade-offs → decisions.", who: "PM, design, engineering, research, founders", tag: "Strongest fit" },
  { t: "Technical and architectural reasoning", d: "Architecture proposals, RFCs, design reviews, engineering trade-offs, incident analysis and system evolution.", who: "Tech leads, architects, engineers, CTOs", tag: "Strongest fit" },
  { t: "Strategic planning and decision-making", d: "Priorities, market opportunities, resource allocation, strategic alternatives, business models and org changes.", who: "Founders, leadership, department heads", tag: "Strong fit" },
  { t: "Problem-solving and root-cause analysis", d: "Collecting evidence, generating hypotheses, testing explanations and agreeing on corrective actions.", who: "Operations, customer success, engineering" },
  { t: "Research and knowledge synthesis", d: "Research questions, hypotheses, experimental design, and interpreting and synthesising findings.", who: "Research teams, R&D" },
  { t: "Creative and campaign development", d: "Developing concepts, challenging directions, evaluating alternatives and refining a shared creative strategy.", who: "Marketing, brand, communications" },
  { t: "Consulting and client problem-solving", d: "Problem framing, hypotheses, evidence, analytical approaches, recommendations and client decisions.", who: "Consultants, analysts, client teams" },
];

const COMPARE = [
  { tool: "Slack, Teams", object: "The message", good: "Who is doing what, right now", loses: "Long arguments flatten into one scroll; the second-best point is buried under forty messages." },
  { tool: "Notion, Confluence", object: "The page", good: "Finished knowledge: specs, policies, runbooks", loses: "The alternatives considered and why they were rejected disappear in the writing-up." },
  { tool: "Miro, FigJam", object: "The shape", good: "Live visual brainstorming in a session", loses: "A sticky note keeps the conclusion, not the challenge and evidence that produced it." },
  { tool: "Meetings", object: "The hour", good: "Converging fast on a specific disagreement", loses: "One voice at a time, no time to check, and the reasoning leaves with the attendees." },
];

const FAQ = [
  { q: "How is a space different from a document or a chat thread?", a: "A thread orders messages by time and a document holds the finished version. A space holds the discussion itself, as cards. Each card does one job (a question, claim, piece of evidence, risk or decision) and links to the cards it responds to, so anyone can follow a line of reasoning from the first question to the decision. The final spec can be linked from the decision card." },
  { q: "What goes on a card?", a: "A title, a short description and the body, with an optional image or web link. Each card carries a phase, from Seed and Discovery through Hypothesis, Specs and Decision to Execution and Retro, and one or more roles, such as question, claim, counter-claim, evidence, risk or mitigation. Type @ and a card's number to reference it, including cards in other spaces." },
  { q: "What does the AI do in a space?", a: "It summarises the space: it names the emergent topic, says where the discussion stands and what is still open in each phase. On any card it can suggest the next one, such as a counter-claim, missing evidence or a mitigation, which you edit before posting. From Explore it can suggest a new space when cards across categories point to a question nobody has opened yet. Nothing is posted without a person." },
  { q: "How does someone catch up on a discussion that's been running for days?", a: "Open the summary for where it stands, then read the cards it points to. Cards are grouped by phase and linked to what they answer, so a newcomer can enter through any card and follow the thread in either direction, instead of scrolling back through days of messages." },
  { q: "When does a discussion still need a meeting?", a: "When one specific disagreement remains after the evidence is in. The space shows exactly which cards are in dispute, so the meeting starts from that context and covers only that point. The outcome goes back into the space as a decision card." },
  { q: "Who can see what?", a: "Spaces and cards follow your workspace's visibility: organisation-wide, team-only, locked spaces and private cards. AI summaries and suggestions are built only from the cards the person viewing them is allowed to see." },
];

const MEDIUM = "https://medium.com/@blue___gene";

// From the founder's Medium (newest first).
const ESSAYS = [
  {
    theme: "The vision",
    title: "Meetings Are Compressed Reasoning",
    dek: "Why complex discussions need a third layer between chat and meetings.",
    meta: "Nov 2026 · 9 min read",
    href: "https://medium.com/@blue___gene/meetings-are-compressed-reasoning-why-complex-discussions-need-a-third-layer-205629bf4644",
  },
  {
    theme: "AI",
    title: "Humans at Both Ends",
    dek: "An AI-native platform for collaborative thinking, and the ergonomics we learned building it.",
    meta: "Nov 2026 · 10 min read",
    href: "https://medium.com/@blue___gene/humans-at-both-ends-ebdac1d50dae",
  },
  {
    theme: "Distributed teams",
    title: "When the Slack Thread Gets Too Big, Teams Hop on a Call. Distributed Teams Can't.",
    dek: "A workspace built around a different primary object: the line of reasoning.",
    meta: "Nov 2026 · 5 min read",
    href: "https://medium.com/@blue___gene/when-the-slack-thread-gets-too-big-and-complex-teams-hop-on-a-call-distributed-teams-cant-fdfc615cd5d3",
  },
  {
    theme: "Design",
    title: "Designing for Collective Intelligence",
    dek: "How platforms can incentivise collaborative thinking and generate high-quality decision traces.",
    meta: "Mar 2026 · 6 min read",
    href: "https://medium.com/@blue___gene/designing-for-collective-intelligence-how-platforms-can-incentivize-collaborative-thinking-and-81993cb5a739",
  },
  {
    theme: "Decision traces",
    title: "Why Decision Traces Built From Structured Conversation Beat AI Reconstruction",
    dek: "The case for capturing reasoning at the source.",
    meta: "Mar 2026 · 5 min read",
    href: "https://medium.com/@blue___gene/why-decision-traces-built-from-structured-conversation-beat-ai-reconstruction-18b62abc8280",
  },
  {
    theme: "First principles",
    title: "The Canvas Is a Lie",
    dek: "Why conversation does the real work in collaborative thinking.",
    meta: "Feb 2026 · 8 min read",
    href: "https://medium.com/@blue___gene/the-canvas-is-a-lie-why-conversation-does-the-real-work-in-collaborative-thinking-49b53f17c786",
  },
];

const STAGES = [
  ["Pre-seed", "Uncertainty and exploration", "Idea development"],
  ["Seed and early growth", "Cross-functional alignment", "Complex product discourse"],
  ["Scaling", "Dependencies and fragmentation", "Connected reasoning"],
  ["Enterprise", "Knowledge fragmentation and continuity", "Institutional reasoning"],
];

export default function Landing() {
  return (
    <div className="mk min-h-screen overflow-x-hidden">
      <MarketingNav />

      <main>
        {/* Hero */}
        <section className="mk-grid relative border-b border-[var(--mk-ink)] pb-16 pt-8 sm:pb-24 sm:pt-14">
          <div className={`${wrap} grid items-center gap-14 lg:grid-cols-[1.05fr_1fr]`}>
            <div>
              <Label>A reasoning layer for distributed teams</Label>
              <h1 className="mk-display mt-6 text-[3rem] sm:text-[4.2rem] lg:text-[4.6rem]">
                A home for the discussions that outgrow chat
                <span className="mk-cursor" aria-hidden />
              </h1>
              <p className={`${lede} mt-7 max-w-[34rem]`}>
                When a thread hits 63 replies and the call would span three time zones, give the thinking a place to live. Questions,
                claims, evidence, risks and decisions become linked cards your team develops asynchronously, so anyone can join hours
                late and see exactly where the argument stands.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <a
                  href="#design-partners"
                  className="mk-btn inline-flex items-center gap-2 rounded-[4px] bg-[var(--mk-indigo)] px-6 py-3.5 text-[15px] font-semibold tracking-tight text-white"
                >
                  Become a design partner <ArrowRight className="h-4 w-4" />
                </a>
                <Link
                  href="/login"
                  className="mk-btn inline-flex items-center rounded-[4px] bg-white px-6 py-3.5 text-[15px] font-semibold tracking-tight text-[var(--mk-ink)]"
                >
                  Log in
                </Link>
              </div>
              <p className="mt-6 text-[13.5px] tracking-tight text-[var(--mk-ink-2)]">
                For teams of 20–200 across locations and schedules. Fits alongside the tools you already use.
              </p>
            </div>
            <div className="relative pb-6 pl-0 sm:pl-10">
              {/* The mascot perched on the window's corner, like a sticker */}
              <LogoBitmap
                className="absolute -right-5 -top-14 z-10 hidden w-[118px] sm:block"
                title="Collabrr logo, as a bitmap"
              />
              <HeroSpace />
            </div>
          </div>
        </section>

        {/* Problem */}
        <Section id="problem" className="bg-white">
          <div className="grid gap-14 lg:grid-cols-[1fr_1.05fr]">
            <div>
              <Label>The gap</Label>
              <h2 className={`${h2} mt-4`}>Hard decisions have nowhere to live.</h2>
              <div className={`${lede} mt-7 grid gap-4`}>
                <p>
                  Someone in Berlin asks whether to rebuild billing. By the time Singapore wakes up, the thread has 63 replies, three
                  design docs, a Loom, two half-formed positions, a risk nobody answered, and a thumbs-up that could mean
                  &ldquo;agreed&rdquo; or just &ldquo;seen&rdquo;.
                </p>
                <p>
                  In an office, someone would say &ldquo;let&apos;s grab thirty minutes&rdquo;. Distributed teams can&apos;t, or one
                  region takes the 6 a.m. call. The reasoning scatters across five tools, and months later nobody can say why the
                  decision was made.
                </p>
                <p className="font-semibold tracking-tight text-[var(--mk-ink)]">
                  Chat is fast but forgets. Docs remember but go stale. Meetings compress reasoning into an hour and lose it when the
                  hour ends.
                </p>
              </div>
            </div>
            <div className="self-start">
              <div className="border border-[var(--mk-ink)] bg-[var(--mk-paper)] p-5 sm:p-6">
                <LayersDiagram />
              </div>
              <p className="mt-4 text-[14.5px] leading-relaxed tracking-tight text-[var(--mk-ink-2)]">
                Complex discussion falls into the gap between chat and meetings. Collabrr adds the missing middle layer, so meetings
                become the exception for converging, not the default container for thinking.
              </p>
            </div>
          </div>
          <div className="mt-16 grid border-y border-[var(--mk-ink)] sm:grid-cols-3">
            {[
              ["61%", "of managers say most of their decision-making time is used ineffectively.", "1"],
              ["~1/3", "of business decisions studied were never implemented.", "2"],
              ["2.8h", "a week the average knowledge worker spends looking for or asking for information.", "3"],
            ].map(([n, t, fn], i) => (
              <div key={fn} className={`py-6 sm:px-6 ${i ? "border-t border-[var(--mk-ink)] sm:border-l sm:border-t-0" : "sm:pl-0"}`}>
                <div className="mk-display text-[3.4rem] tabular-nums">{n}</div>
                <p className="mt-2 max-w-[18rem] text-[14px] leading-snug tracking-tight text-[var(--mk-ink-2)]">
                  {t}
                  <sup>
                    <a href={`#fn-${fn}`} className="ml-0.5 font-semibold text-[var(--mk-indigo)]">
                      {fn}
                    </a>
                  </sup>
                </p>
              </div>
            ))}
          </div>
        </Section>

        {/* 1968 */}
        <section className="mk-scan relative overflow-hidden bg-[var(--mk-ink)] text-white">
          <DitherBand color="var(--mk-ink)" flip className="bg-white" />
          <div className={`${wrap} grid items-center gap-12 py-20 sm:py-24 lg:grid-cols-[1fr_1fr]`}>
            <div>
              <Label tone="light">Dec 9, 1968 · San Francisco</Label>
              <h2 className="mk-display mt-4 text-[2.4rem] sm:text-[3.4rem]">
                In 1968, Douglas Engelbart linked ideas on a shared screen.
              </h2>
              <div className="mt-7 grid gap-4 text-[17px] leading-[1.6] tracking-[-0.01em] text-white/75">
                <p>
                  The demo later called the &ldquo;Mother of All Demos&rdquo; introduced the mouse, hypertext links and real-time
                  collaborative editing, all in service of one idea: augmenting how groups think together.
                </p>
                <p>
                  Teams now have chat, docs and video calls, and still no place where a hard argument can live. Collabrr picks up the
                  thread: cards instead of messages, links instead of scrollback, and AI that reads everything so people can say what
                  matters.
                </p>
              </div>
            </div>
            <div className="border border-white/20 bg-black/30 p-4 sm:p-6">
              <LinkedCardsScreen className="block w-full" />
              <div className="mk-pixel mt-4 flex items-center justify-between text-[10px] text-white/50">
                <span>cards · links · phases</span>
                <span>58 years later</span>
              </div>
            </div>
          </div>
          <DitherBand color="var(--mk-ink)" className="bg-[var(--mk-paper)]" />
        </section>

        {/* Pillars */}
        <Section>
          <div className="grid border-l border-t border-[var(--mk-ink)] sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((p) => (
              <div key={p.title} className="border-b border-r border-[var(--mk-ink)] bg-white p-6">
                <PixelIcon name={p.icon} color="var(--mk-indigo)" className="h-8 w-8" />
                <h3 className="mt-6 text-[1.3rem] font-bold leading-tight tracking-[-0.035em]">{p.title}</h3>
                <p className="mt-3 text-[14.5px] leading-relaxed tracking-tight text-[var(--mk-ink-2)]">{p.body}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* How it works */}
        <Section id="how" className="border-t border-[var(--mk-ink)] bg-white">
          <div className="max-w-3xl">
            <Label>How it works</Label>
            <h2 className={`${h2} mt-4`}>The line of reasoning is the primary object.</h2>
            <p className={`${lede} mt-6 max-w-2xl`}>
              Chat is built around the message, docs around the page, whiteboards around the shape. Collabrr is built around the line
              of reasoning: documentation in conversational format.
            </p>
          </div>
          <div className="mt-14 grid gap-12 lg:grid-cols-[1fr_1fr]">
            <ol className="grid content-start border-t border-[var(--mk-ink)]">
              {PRIMITIVES.map((p, i) => (
                <li key={p.k} className="grid grid-cols-[3.5rem_1fr] gap-2 border-b border-[var(--mk-ink)] py-6">
                  <span className="mk-display text-[2.2rem] tabular-nums text-[var(--mk-indigo)]">{i + 1}</span>
                  <div>
                    <div className="mk-pixel text-[10px] text-[var(--mk-cyan)]">{p.k}</div>
                    <h3 className="mt-1 text-[1.25rem] font-bold leading-tight tracking-[-0.035em]">{p.t}</h3>
                    <p className="mt-2 text-[14.5px] leading-relaxed tracking-tight text-[var(--mk-ink-2)]">{p.d}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div>
              <DecisionFlow />
            </div>
          </div>
          <div className="mt-16 grid border border-[var(--mk-ink)] sm:grid-cols-3">
            {[
              ["Chat", "Now", "presence and pulse"],
              ["Docs", "Know", "policy, spec and record"],
              ["Collabrr", "How", "the path from first question to decision"],
            ].map(([tool, w, d], i) => (
              <div
                key={tool}
                className={`p-6 ${i ? "border-t border-[var(--mk-ink)] sm:border-l sm:border-t-0" : ""} ${tool === "Collabrr" ? "bg-[var(--mk-indigo)] text-white" : ""}`}
              >
                <div className={`mk-pixel text-[10px] ${tool === "Collabrr" ? "text-white/80" : "text-[var(--mk-ink-2)]"}`}>{tool}</div>
                <div className="mk-display mt-1 text-[3rem]">{w}</div>
                <div className={`mt-1 text-[14px] tracking-tight ${tool === "Collabrr" ? "text-white/85" : "text-[var(--mk-ink-2)]"}`}>{d}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* AI */}
        <Section id="ai" className="border-t border-[var(--mk-ink)]">
          <div className="grid gap-14 lg:grid-cols-[1fr_1fr]">
            <div>
              <Label>AI, with humans at both ends</Label>
              <h2 className={`${h2} mt-4`}>AI that helps people reach people.</h2>
              <p className={`${lede} mt-6`}>
                In Collabrr, AI doesn&apos;t talk to itself. It reads the whole discussion so people can say what matters. Sometimes
                your team&apos;s cards are the base and the AI enriches them; sometimes the AI lays down a draft and your team enriches
                it. A person posts every card, under their own name.
              </p>
              <div className="mt-9">
                <ModesDiagram />
              </div>
            </div>
            <div className="grid content-start gap-4">
              {[
                {
                  k: "Consolidation",
                  t: "A topic nobody had to choose",
                  d: "Once a space has enough cards, Collabrr names what it has become and summarises where each phase stands. Every point links to the cards behind it, so the summary is a way in, never a substitute.",
                },
                {
                  k: "Expansion",
                  t: "The next card worth writing",
                  d: "Linger on a card and Collabrr suggests what that phase is missing: an unanswered question, a risk without a mitigation, a claim without evidence. It is drafted in the voice the phase calls for, and you edit it before posting.",
                },
                {
                  k: "Initiation",
                  t: "The space nobody has opened yet",
                  d: "On Explore, Collabrr reads every space and card you can see, across all categories, and proposes new spaces for open threads, cross-team signals and unresolved tensions, each with the opening card to start it.",
                },
              ].map((f) => (
                <div key={f.k} className="mk-hard-sm rounded-[5px] bg-white p-5">
                  <div className="mk-pixel flex items-center gap-2 text-[10px] text-[var(--mk-indigo)]">
                    <PixelIcon name="spark" color="var(--mk-indigo)" className="h-3 w-3" />
                    {f.k}
                  </div>
                  <h3 className="mt-2 text-[1.25rem] font-bold leading-tight tracking-[-0.035em]">{f.t}</h3>
                  <p className="mt-2 text-[14.5px] leading-relaxed tracking-tight text-[var(--mk-ink-2)]">{f.d}</p>
                </div>
              ))}
              <p className="text-[13px] tracking-tight text-[var(--mk-ink-2)]">Built only from the cards the person viewing it is allowed to see.</p>
            </div>
          </div>
        </Section>

        {/* Use cases */}
        <Section id="use-cases" className="border-t border-[var(--mk-ink)] bg-white">
          <div className="max-w-3xl">
            <Label>Use cases</Label>
            <h2 className={`${h2} mt-4`}>Wherever a decision has a multi-day tail.</h2>
            <p className={`${lede} mt-6 max-w-2xl`}>
              The discussions that matter recur, involve several people, run over days, have real consequences, and lose their
              continuity in today&apos;s tools.
            </p>
          </div>
          <div className="mt-12 grid border-l border-t border-[var(--mk-ink)] sm:grid-cols-2 lg:grid-cols-3">
            {USE_CASES.map((u, i) => (
              <div key={u.t} className="flex flex-col border-b border-r border-[var(--mk-ink)] p-6">
                <div className="flex items-start justify-between gap-3">
                  <span className="mk-pixel text-[10px] tabular-nums text-[var(--mk-ink-2)]">{String(i + 1).padStart(2, "0")}</span>
                  {u.tag && (
                    <span className="mk-pixel border border-[var(--mk-green)] bg-[var(--mk-green-soft)] px-1.5 py-0.5 text-[9px] text-[var(--mk-green)]">
                      {u.tag}
                    </span>
                  )}
                </div>
                <h3 className="mt-3 text-[1.2rem] font-bold leading-tight tracking-[-0.035em]">{u.t}</h3>
                <p className="mt-2 flex-1 text-[14.5px] leading-relaxed tracking-tight text-[var(--mk-ink-2)]">{u.d}</p>
                <p className="mt-4 text-[12.5px] font-semibold tracking-tight">{u.who}</p>
              </div>
            ))}
            <a
              href="#design-partners"
              className="group flex flex-col justify-between border-b border-r border-[var(--mk-ink)] bg-[var(--mk-indigo)] p-6 text-white lg:col-span-2"
            >
              <span className="mk-pixel text-[10px] text-white/75">Not on the list?</span>
              <span className="mt-3 block max-w-xl text-[1.5rem] font-bold leading-tight tracking-[-0.035em]">
                If it takes days, involves several people and has real consequences, it belongs in Collabrr.
              </span>
              <span className="mt-6 inline-flex items-center gap-2 text-[15px] font-semibold tracking-tight">
                Bring it as a design partner <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </a>
          </div>
        </Section>

        {/* Compare */}
        <Section id="compare" className="border-t border-[var(--mk-ink)]">
          <div className="max-w-3xl">
            <Label>Compare</Label>
            <h2 className={`${h2} mt-4`}>Keep your tools. Give the thinking a home.</h2>
            <p className={`${lede} mt-6 max-w-2xl`}>
              Collabrr sits alongside them. Move a thread that&apos;s outgrown Slack into a space, think it through there, and link the
              final spec and the tickets from the decision card, so the reasoning stays one click away.
            </p>
          </div>
          <div className="mt-12 overflow-x-auto border border-[var(--mk-ink)] bg-white">
            <table className="w-full min-w-[760px] border-collapse text-left text-[14.5px] tracking-tight">
              <thead>
                <tr className="border-b border-[var(--mk-ink)]">
                  {["Tool", "Built around", "Great for", "What gets lost in long discussions"].map((h) => (
                    <th key={h} className="mk-pixel px-5 py-3.5 text-[10px] font-normal text-[var(--mk-ink-2)]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE.map((r) => (
                  <tr key={r.tool} className="border-b border-[var(--mk-rule)] align-top">
                    <td className="px-5 py-4 font-bold">{r.tool}</td>
                    <td className="px-5 py-4 text-[var(--mk-ink-2)]">{r.object}</td>
                    <td className="px-5 py-4 text-[var(--mk-ink-2)]">{r.good}</td>
                    <td className="px-5 py-4 text-[var(--mk-ink-2)]">{r.loses}</td>
                  </tr>
                ))}
                <tr className="bg-[var(--mk-indigo)] align-top text-white">
                  <td className="px-5 py-4 font-bold">Collabrr</td>
                  <td className="px-5 py-4 font-medium">The line of reasoning</td>
                  <td className="px-5 py-4 font-medium">Long, multi-branch, cross-team discussions, asynchronously</td>
                  <td className="px-5 py-4 font-medium">Kept: the options, objections, evidence and rationale, linked to the decision.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        {/* Vision */}
        <Section className="border-t border-[var(--mk-ink)] bg-white">
          <div className="grid gap-14 lg:grid-cols-[1fr_1.05fr]">
            <div>
              <Label>Where this goes</Label>
              <h2 className={`${h2} mt-4`}>Two layers got us here. Three will get us further.</h2>
              <div className={`${lede} mt-6 grid gap-4`}>
                <p>
                  We start with distributed teams, because for them the meeting is already broken. The bigger shift is for every
                  organisation: a reasoning layer between chat and meetings, where complex work is developed, kept and reused.
                </p>
                <p>
                  Over time those decision traces become your organisation&apos;s memory of how it thinks, and the context your people,
                  and your AI agents, need to decide well.
                </p>
              </div>
            </div>
            <div className="self-start overflow-x-auto border border-[var(--mk-ink)]">
              <table className="w-full min-w-[520px] border-collapse text-left text-[14.5px] tracking-tight">
                <thead>
                  <tr className="border-b border-[var(--mk-ink)] bg-[var(--mk-paper)]">
                    {["Company stage", "Dominant reasoning problem", "Collabrr helps with"].map((h) => (
                      <th key={h} className="mk-pixel px-5 py-3.5 text-[10px] font-normal text-[var(--mk-ink-2)]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {STAGES.map(([s, p, c]) => (
                    <tr key={s} className="border-b border-[var(--mk-rule)] last:border-b-0">
                      <td className="px-5 py-4 font-bold">{s}</td>
                      <td className="px-5 py-4 text-[var(--mk-ink-2)]">{p}</td>
                      <td className="px-5 py-4 font-semibold text-[var(--mk-indigo-deep)]">{c}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Section>

        {/* Design partners */}
        <Section id="design-partners" className="mk-grid border-t border-[var(--mk-ink)]">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <Label>Design partners</Label>
              <h2 className={`${h2} mt-4`}>Bring one live decision. We&apos;ll run it in Collabrr with you.</h2>
              <p className={`${lede} mt-6`}>
                We&apos;re working closely with a small number of teams whose important discussions are outgrowing messages, documents
                and meetings.
              </p>
              <div className="mt-8 border border-[var(--mk-ink)] bg-white p-5">
                <div className="mk-pixel text-[10px]">A good fit if your team</div>
                <ul className="mt-3 grid gap-2 text-[14.5px] tracking-tight text-[var(--mk-ink-2)]">
                  {[
                    "Has 20–200 people with product, design, engineering and business functions",
                    "Works across locations, schedules or at least three time zones",
                    "Uses Slack or Teams, Notion or Google Docs, and Linear or Jira",
                    "Regularly faces decisions that outgrow a Slack thread",
                  ].map((t) => (
                    <li key={t} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--mk-green)]" />
                      {t}
                    </li>
                  ))}
                </ul>
                <div className="mk-pixel mt-5 text-[10px]">What you get</div>
                <ul className="mt-3 grid gap-2 text-[14.5px] tracking-tight text-[var(--mk-ink-2)]">
                  {["Early access for your team", "A direct line to the founder", "A real say in what gets built next"].map((t) => (
                    <li key={t} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--mk-indigo)]" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="mt-5 text-[14px] tracking-tight text-[var(--mk-ink-2)]">
                Already have a workspace?{" "}
                <Link href="/login" className="font-semibold text-[var(--mk-ink)] underline underline-offset-4">
                  Log in
                </Link>
              </p>
            </div>
            <div className="relative">
              <DesignPartnerForm />
            </div>
          </div>
        </Section>

        {/* Essays */}
        <Section id="essays" className="border-t border-[var(--mk-ink)] bg-white">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-3xl">
              <Label>From the founder</Label>
              <h2 className={`${h2} mt-4`}>The thinking behind Collabrr.</h2>
              <p className={`${lede} mt-6 max-w-2xl`}>
                Essays on how teams reason together, why meetings and chat fall short for hard decisions, and how AI should join the
                conversation.
              </p>
            </div>
            <a
              href={MEDIUM}
              target="_blank"
              rel="noopener noreferrer"
              className="mk-btn inline-flex items-center gap-2 rounded-[4px] bg-white px-5 py-2.5 text-[14px] font-semibold tracking-tight"
            >
              All essays on Medium <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {ESSAYS.map((e) => (
              <a
                key={e.href}
                href={e.href}
                target="_blank"
                rel="noopener noreferrer"
                className="mk-hard-sm mk-lift group flex flex-col rounded-[5px] bg-white p-5"
              >
                <span className="mk-pixel text-[10px] text-[var(--mk-cyan)]">{e.theme}</span>
                <h3 className="mt-3 text-[1.2rem] font-bold leading-tight tracking-[-0.035em] group-hover:text-[var(--mk-indigo)]">{e.title}</h3>
                <p className="mt-2 flex-1 text-[14.5px] leading-relaxed tracking-tight text-[var(--mk-ink-2)]">{e.dek}</p>
                <span className="mt-5 flex items-center justify-between border-t border-[var(--mk-rule)] pt-3 text-[12.5px] tracking-tight text-[var(--mk-ink-2)]">
                  {e.meta}
                  <ArrowUpRight className="h-4 w-4 transition group-hover:text-[var(--mk-indigo)]" />
                </span>
              </a>
            ))}
          </div>
        </Section>

        {/* FAQ */}
        <Section className="border-t border-[var(--mk-ink)]">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <Label>Questions</Label>
              <h2 className={`${h2} mt-4`}>What teams ask first.</h2>
            </div>
            <div className="border-t border-[var(--mk-ink)]">
              {FAQ.map((f) => (
                <details key={f.q} className="group border-b border-[var(--mk-ink)] py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-semibold tracking-[-0.02em]">
                    {f.q}
                    <Plus className="h-5 w-5 shrink-0 transition group-open:rotate-45" />
                  </summary>
                  <p className="mt-3 max-w-2xl text-[15px] leading-relaxed tracking-tight text-[var(--mk-ink-2)]">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </Section>

        {/* Closing */}
        <section className="mk-scan relative overflow-hidden bg-[var(--mk-ink)] text-white">
          <DitherBand color="var(--mk-ink)" flip className="bg-[var(--mk-paper)]" />
          <div className={`${wrap} grid items-center gap-12 py-20 sm:py-24 lg:grid-cols-[1.3fr_0.7fr]`}>
            <div>
              <p className="mk-bit text-[#8fe3f3]">&gt; thread.replies = 63</p>
              <h2 className="mk-display mt-5 text-[2.4rem] sm:text-[3.6rem]">
                Don&apos;t ask who can jump on a call. Ask where this thinking should live
                <span className="mk-cursor" aria-hidden />
              </h2>
              <div className="mt-9 flex flex-wrap gap-3">
                <a
                  href="#design-partners"
                  className="inline-flex items-center gap-2 rounded-[4px] border border-white bg-white px-6 py-3.5 text-[15px] font-semibold tracking-tight text-[var(--mk-ink)] shadow-[3px_3px_0_var(--mk-cyan)] transition hover:-translate-x-px hover:-translate-y-px hover:shadow-[4px_4px_0_var(--mk-cyan)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
                >
                  Become a design partner <ArrowRight className="h-4 w-4" />
                </a>
                <Link
                  href="/login"
                  className="inline-flex items-center rounded-[4px] border border-white/40 px-6 py-3.5 text-[15px] font-semibold tracking-tight text-white hover:border-white"
                >
                  Log in
                </Link>
              </div>
            </div>
            <LogoBitmap className="mx-auto w-full max-w-[320px]" />
          </div>
        </section>
      </main>

      <footer className="bg-[var(--mk-ink)] text-white">
        <div className={`${wrap} grid gap-10 border-t border-white/15 py-12 sm:grid-cols-[1.3fr_1fr]`}>
          <div>
            <Logo size={24} inverted />
            <p className="mt-3 max-w-sm text-[14px] tracking-tight text-white/65">
              Infrastructure for collaborative thinking. The reasoning layer between quick chat and finished docs.
            </p>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[14px] font-medium tracking-tight">
              <Link href="/login" className="hover:text-[#8fe3f3]">Log in</Link>
              <a href="#design-partners" className="hover:text-[#8fe3f3]">Design partners</a>
              <a href="#how" className="hover:text-[#8fe3f3]">How it works</a>
              <a href="#ai" className="hover:text-[#8fe3f3]">AI</a>
              <a href={MEDIUM} target="_blank" rel="noopener noreferrer" className="hover:text-[#8fe3f3]">Essays on Medium</a>
            </div>
          </div>
          <div className="text-[12.5px] leading-relaxed tracking-tight text-white/60">
            <div className="mk-pixel mb-3 text-[10px] text-white/80">Sources</div>
            <ol className="grid gap-1.5">
              <li id="fn-1">
                1.{" "}
                <a className="underline-offset-2 hover:underline" href="https://www.mckinsey.com/capabilities/people-and-organization/our-insights/decision-making-in-the-age-of-urgency" target="_blank" rel="noopener noreferrer">
                  McKinsey, Decision making in the age of urgency
                </a>{" "}
                (survey of managers).
              </li>
              <li id="fn-2">
                2.{" "}
                <a className="underline-offset-2 hover:underline" href="https://www.eurekalert.org/news-releases/1012456" target="_blank" rel="noopener noreferrer">
                  Paul Nutt, Ohio State University, study of business decisions
                </a>
                .
              </li>
              <li id="fn-3">
                3. APQC research, as cited by{" "}
                <a className="underline-offset-2 hover:underline" href="https://www.zoho.com/connect/the-collective/digital-friction-at-work.html" target="_blank" rel="noopener noreferrer">
                  Zoho
                </a>
                .
              </li>
            </ol>
            <p className="mk-pixel mt-6 text-[10px] text-white/50">© {new Date().getFullYear()} Collabrr</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
