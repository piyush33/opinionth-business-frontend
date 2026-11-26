// collabrr.io marketing site. Copy draws on the founder's essays; the claims
// with numbers carry their sources in the footnotes at the bottom.
import Link from "next/link";
import {
  ArrowRight,
  MessagesSquare,
  History,
  Network,
  Scale,
  Sparkles,
  Compass,
  PenLine,
  Layers,
  Check,
  Globe2,
  ChevronDown,
} from "lucide-react";
import MarketingNav, { Logo } from "./MarketingNav";
import DesignPartnerForm from "./DesignPartnerForm";
import { HeroSpace, LayersDiagram, DecisionFlow, ModesDiagram } from "./Visuals";

const wrap = "mx-auto w-full max-w-6xl px-4 sm:px-6";
const eyebrow = "text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--mk-indigo)]";
const h2 = "mk-display text-[2rem] font-bold leading-[1.1] sm:text-[2.6rem]";
const lede = "text-[17px] leading-relaxed text-[var(--mk-ink-2)] sm:text-[18px]";

function Section({
  id,
  children,
  className = "",
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`scroll-mt-20 py-20 sm:py-28 ${className}`}>
      <div className={wrap}>{children}</div>
    </section>
  );
}

const PILLARS = [
  {
    icon: MessagesSquare,
    title: "Complex discussions, asynchronously",
    body: "Long, multi-branch discussions get a space of their own. People research before they reply, contribute when they think best, and nobody has to take the 6 a.m. call.",
  },
  {
    icon: History,
    title: "Context that survives",
    body: "Join hours or months late and see where the argument stands: what's settled, what's contested, what's still open, and why. New hires read the why, not just the what.",
  },
  {
    icon: Network,
    title: "Cross-department osmosis",
    body: "Product, design, engineering and business add their angle as linked cards in the same space. Insights reach the teams that need them instead of dying in one channel.",
  },
  {
    icon: Scale,
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
  { q: "Isn't this what Notion does?", a: "Notion is excellent for finished knowledge. Collabrr is for the discussion before it: the options, objections and evidence. Write the final spec in Notion and link it from the decision card, so the reasoning is one click away." },
  { q: "Does Collabrr replace meetings?", a: "No. It removes the need to use meetings for work that can be developed asynchronously. When a meeting is needed, it's about one specific disagreement, and it starts with the accumulated context instead of from scratch." },
  { q: "Won't structure slow people down?", a: "Structure that costs effort in the moment is why earlier tools were loved by researchers and ignored by teams. In Collabrr, choosing a card's role takes a click, and AI suggests the next card in the right voice, so the structure is a by-product of discussing, not a tax on it." },
  { q: "Who can see what?", a: "Spaces and cards follow your workspace's visibility: organisation-wide, team-only, locked spaces and private cards. AI summaries and suggestions are built only from the cards the person viewing them is allowed to see." },
  { q: "Will people know where to start?", a: "Every card is a valid entry point. Start with a question, add what you know, and link to what you're responding to. Spaces gain shape as the cards accumulate, and the AI names the topic once there's enough to name." },
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
        <section className="relative pb-16 pt-10 sm:pb-24 sm:pt-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[560px] bg-[radial-gradient(60%_60%_at_80%_10%,var(--mk-cyan-soft),transparent_70%),radial-gradient(50%_50%_at_10%_0%,var(--mk-indigo-soft),transparent_70%)]"
          />
          <div className={`${wrap} relative grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]`}>
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--mk-rule)] bg-white/80 px-3 py-1 text-[13px] font-medium text-[var(--mk-ink-2)]">
                <Globe2 className="h-4 w-4 text-[var(--mk-cyan)]" />
                Built first for distributed product teams
              </div>
              <h1 className="mk-display text-[2.6rem] font-extrabold leading-[1.02] sm:text-[3.6rem] lg:text-[4rem]">
                A home for the discussions that outgrow Slack.
              </h1>
              <p className={`${lede} mt-6 max-w-xl`}>
                When a thread hits 63 replies and the call would span three time zones, Collabrr gives the thinking a place to live.
                Questions, claims, evidence, risks and decisions become linked cards your team develops asynchronously, so anyone can
                join hours late and see exactly where the argument stands.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a
                  href="#design-partners"
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--mk-indigo)] px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_10px_30px_-12px_rgba(91,92,240,0.8)] hover:bg-[var(--mk-indigo-deep)]"
                >
                  Become a design partner <ArrowRight className="h-4 w-4" />
                </a>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--mk-rule)] bg-white px-6 py-3.5 text-[15px] font-semibold text-[var(--mk-ink)] hover:border-[var(--mk-indigo)]"
                >
                  Log in
                </Link>
              </div>
              <p className="mt-5 text-[13.5px] text-[var(--mk-ink-2)]">
                For teams of 20–200 working across locations and schedules, alongside Slack, Notion and Linear.
              </p>
            </div>
            <div className="mk-float relative">
              <HeroSpace />
            </div>
          </div>
        </section>

        {/* Problem */}
        <Section id="problem" className="border-t border-[var(--mk-rule)] bg-white">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <p className={eyebrow}>The gap</p>
              <h2 className={`${h2} mt-3`}>Hard decisions have nowhere to live.</h2>
              <div className={`${lede} mt-6 grid gap-4`}>
                <p>
                  Someone in Berlin asks whether to rebuild billing. By the time Singapore wakes up, the thread has 63 replies, three
                  design docs, a Loom, two half-formed positions, a risk nobody answered, and a thumbs-up that could mean
                  &ldquo;agreed&rdquo; or just &ldquo;seen&rdquo;.
                </p>
                <p>
                  In an office, someone would say &ldquo;let&apos;s grab thirty minutes&rdquo;. Distributed teams can&apos;t, or one
                  region takes the 6 a.m. call. So the thread keeps growing, the reasoning scatters across five tools, and months later
                  nobody can say why the decision was made.
                </p>
                <p className="font-medium text-[var(--mk-ink)]">
                  Chat is fast but forgets. Docs remember but go stale. Meetings compress reasoning into an hour and lose it when the
                  hour ends.
                </p>
              </div>
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {[
                  ["61%", "of managers say most of their decision-making time is used ineffectively.", "1"],
                  ["~⅓", "of business decisions studied were never implemented.", "2"],
                  ["2.8 h", "a week the average knowledge worker spends looking for or asking for information.", "3"],
                ].map(([n, t, fn]) => (
                  <div key={fn} className="border-t-2 border-[var(--mk-ink)] pt-3">
                    <div className="mk-display text-3xl font-bold">{n}</div>
                    <p className="mt-1 text-[13.5px] leading-snug text-[var(--mk-ink-2)]">
                      {t}
                      <sup>
                        <a href={`#fn-${fn}`} className="ml-0.5 text-[var(--mk-indigo)]">
                          {fn}
                        </a>
                      </sup>
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="self-start rounded-3xl border border-[var(--mk-rule)] bg-[var(--mk-paper)] p-5 sm:p-7">
              <LayersDiagram />
              <p className="mt-6 text-[15px] leading-relaxed text-[var(--mk-ink-2)]">
                Complex discussion falls into the gap between chat and meetings. Collabrr adds the missing middle layer, so meetings
                become the exception for converging, not the default container for thinking.
              </p>
            </div>
          </div>
        </Section>

        {/* Pillars */}
        <Section className="pt-0 sm:pt-0">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((p) => (
              <div key={p.title} className="rounded-2xl border border-[var(--mk-rule)] bg-white p-5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--mk-indigo-soft)]">
                  <p.icon className="h-5 w-5 text-[var(--mk-indigo)]" />
                </span>
                <h3 className="mk-display mt-4 text-[1.2rem] font-bold leading-snug">{p.title}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--mk-ink-2)]">{p.body}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* How it works */}
        <Section id="how" className="border-t border-[var(--mk-rule)] bg-white">
          <div className="max-w-2xl">
            <p className={eyebrow}>How it works</p>
            <h2 className={`${h2} mt-3`}>The line of reasoning is the primary object.</h2>
            <p className={`${lede} mt-5`}>
              Slack is built around the message, Notion around the page, Miro around the shape. Collabrr is built around the line of
              reasoning. It&apos;s documentation in conversational format: nobody stops to write up the thinking, because the
              thinking is the documentation.
            </p>
          </div>
          <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_1fr]">
            <ol className="grid gap-4">
              {PRIMITIVES.map((p, i) => (
                <li key={p.k} className="flex gap-4 rounded-2xl border border-[var(--mk-rule)] bg-[var(--mk-paper)] p-5">
                  <span className="mk-display grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--mk-ink)] text-[15px] font-bold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--mk-cyan)]">{p.k}</div>
                    <h3 className="mk-display mt-0.5 text-[1.15rem] font-bold">{p.t}</h3>
                    <p className="mt-1.5 text-[14.5px] leading-relaxed text-[var(--mk-ink-2)]">{p.d}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div>
              <div className="mb-3 text-[13px] font-semibold text-[var(--mk-ink-2)]">Example: a checkout redesign</div>
              <DecisionFlow />
            </div>
          </div>
          <div className="mt-12 grid gap-4 rounded-3xl bg-[var(--mk-ink)] p-6 text-white sm:grid-cols-3 sm:p-8">
            {[
              ["Slack", "Now", "presence and pulse"],
              ["Notion", "Know", "policy, spec and record"],
              ["Collabrr", "How", "the path from first question to decision"],
            ].map(([tool, w, d]) => (
              <div key={tool}>
                <div className="text-[13px] text-white/60">{tool}</div>
                <div className={`mk-display text-3xl font-bold ${tool === "Collabrr" ? "text-[#8fe3f3]" : ""}`}>{w}</div>
                <div className="text-[14px] text-white/75">{d}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* AI */}
        <Section id="ai">
          <div className="grid gap-12 lg:grid-cols-[1fr_1fr]">
            <div>
              <p className={eyebrow}>AI, with humans at both ends</p>
              <h2 className={`${h2} mt-3`}>AI that helps people reach people.</h2>
              <p className={`${lede} mt-5`}>
                In Collabrr, AI doesn&apos;t talk to itself. It reads the whole discussion so people can say what matters. Sometimes
                your team&apos;s cards are the base and the AI enriches them. Sometimes the AI lays down a draft and your team enriches
                it. Either way, a person posts every card, under their own name.
              </p>
              <div className="mt-8">
                <ModesDiagram />
              </div>
            </div>
            <div className="grid gap-4">
              {[
                {
                  icon: Layers,
                  k: "Consolidation",
                  t: "A topic nobody had to choose",
                  d: "Once a space has enough cards, Collabrr names what it's become and summarises where each phase stands. Every point links back to the cards behind it, so the summary is a way in, never a substitute.",
                },
                {
                  icon: PenLine,
                  k: "Expansion",
                  t: "The next card worth writing",
                  d: "Linger on a card and Collabrr suggests what that phase is missing: an unanswered question, a risk without a mitigation, a claim without evidence. It's drafted in the voice the phase calls for, and you edit it before posting.",
                },
                {
                  icon: Compass,
                  k: "Initiation",
                  t: "The space nobody has opened yet",
                  d: "On Explore, Collabrr reads every space and card you can see, across all categories, and proposes new spaces for open threads, cross-team signals and unresolved tensions, each with the opening card to start it.",
                },
              ].map((f) => (
                <div key={f.k} className="flex gap-4 rounded-2xl border border-[var(--mk-rule)] bg-white p-5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-100">
                    <f.icon className="h-5 w-5 text-violet-700" />
                  </span>
                  <div>
                    <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-violet-700">{f.k}</div>
                    <h3 className="mk-display mt-0.5 text-[1.15rem] font-bold">{f.t}</h3>
                    <p className="mt-1.5 text-[14.5px] leading-relaxed text-[var(--mk-ink-2)]">{f.d}</p>
                  </div>
                </div>
              ))}
              <p className="flex items-center gap-2 px-1 text-[13px] text-[var(--mk-ink-2)]">
                <Sparkles className="h-4 w-4 text-violet-600" />
                Built only from the cards the person viewing it is allowed to see.
              </p>
            </div>
          </div>
        </Section>

        {/* Use cases */}
        <Section id="use-cases" className="border-t border-[var(--mk-rule)] bg-white">
          <div className="max-w-2xl">
            <p className={eyebrow}>Use cases</p>
            <h2 className={`${h2} mt-3`}>Wherever a decision has a multi-day tail.</h2>
            <p className={`${lede} mt-5`}>
              The discussions that matter recur, involve several people, run over days, have real consequences, and lose their
              continuity in today&apos;s tools.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {USE_CASES.map((u) => (
              <div key={u.t} className="flex flex-col rounded-2xl border border-[var(--mk-rule)] bg-[var(--mk-paper)] p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="mk-display text-[1.12rem] font-bold leading-snug">{u.t}</h3>
                  {u.tag && (
                    <span className="shrink-0 rounded-full bg-[var(--mk-green-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--mk-green)]">
                      {u.tag}
                    </span>
                  )}
                </div>
                <p className="mt-2 flex-1 text-[14.5px] leading-relaxed text-[var(--mk-ink-2)]">{u.d}</p>
                <p className="mt-3 text-[12.5px] font-medium text-[var(--mk-ink)]">{u.who}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Compare */}
        <Section id="compare">
          <div className="max-w-2xl">
            <p className={eyebrow}>Compare</p>
            <h2 className={`${h2} mt-3`}>Keep your tools. Give the thinking a home.</h2>
            <p className={`${lede} mt-5`}>
              Collabrr sits alongside them. Move a thread that&apos;s outgrown Slack into a space, think it through there, and link the
              final spec and the tickets from the decision card, so the reasoning stays one click away.
            </p>
          </div>
          <div className="mt-10 overflow-x-auto rounded-2xl border border-[var(--mk-rule)] bg-white">
            <table className="w-full min-w-[720px] border-collapse text-left text-[14.5px]">
              <thead>
                <tr className="text-[12px] uppercase tracking-[0.12em] text-[var(--mk-ink-2)]">
                  <th className="px-5 py-4 font-semibold">Tool</th>
                  <th className="px-5 py-4 font-semibold">Built around</th>
                  <th className="px-5 py-4 font-semibold">Great for</th>
                  <th className="px-5 py-4 font-semibold">What gets lost in long discussions</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map((r) => (
                  <tr key={r.tool} className="border-t border-[var(--mk-rule)] align-top">
                    <td className="px-5 py-4 font-semibold">{r.tool}</td>
                    <td className="px-5 py-4 text-[var(--mk-ink-2)]">{r.object}</td>
                    <td className="px-5 py-4 text-[var(--mk-ink-2)]">{r.good}</td>
                    <td className="px-5 py-4 text-[var(--mk-ink-2)]">{r.loses}</td>
                  </tr>
                ))}
                <tr className="border-t border-[var(--mk-rule)] bg-[var(--mk-indigo-soft)] align-top">
                  <td className="px-5 py-4 font-bold text-[var(--mk-indigo-deep)]">Collabrr</td>
                  <td className="px-5 py-4 font-medium text-[var(--mk-indigo-deep)]">The line of reasoning</td>
                  <td className="px-5 py-4 font-medium text-[var(--mk-indigo-deep)]">Long, multi-branch, cross-team discussions, asynchronously</td>
                  <td className="px-5 py-4 font-medium text-[var(--mk-indigo-deep)]">
                    Kept: the options, objections, evidence and rationale, linked to the decision.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        {/* Vision */}
        <Section className="border-t border-[var(--mk-rule)] bg-white">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <p className={eyebrow}>Where this goes</p>
              <h2 className={`${h2} mt-3`}>Two layers got us here. Three will get us further.</h2>
              <div className={`${lede} mt-5 grid gap-4`}>
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
            <div className="overflow-x-auto rounded-2xl border border-[var(--mk-rule)]">
              <table className="w-full min-w-[520px] border-collapse text-left text-[14.5px]">
                <thead className="bg-[var(--mk-paper)]">
                  <tr className="text-[12px] uppercase tracking-[0.12em] text-[var(--mk-ink-2)]">
                    <th className="px-5 py-3.5 font-semibold">Company stage</th>
                    <th className="px-5 py-3.5 font-semibold">Dominant reasoning problem</th>
                    <th className="px-5 py-3.5 font-semibold">Collabrr helps with</th>
                  </tr>
                </thead>
                <tbody>
                  {STAGES.map(([s, p, c]) => (
                    <tr key={s} className="border-t border-[var(--mk-rule)]">
                      <td className="px-5 py-3.5 font-semibold">{s}</td>
                      <td className="px-5 py-3.5 text-[var(--mk-ink-2)]">{p}</td>
                      <td className="px-5 py-3.5 font-medium text-[var(--mk-indigo-deep)]">{c}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Section>

        {/* Design partners */}
        <Section id="design-partners">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className={eyebrow}>Design partners</p>
              <h2 className={`${h2} mt-3`}>Bring one live decision. We&apos;ll run it in Collabrr with you.</h2>
              <p className={`${lede} mt-5`}>
                We&apos;re working closely with a small number of teams whose important discussions are outgrowing messages, documents
                and meetings.
              </p>
              <div className="mt-8 rounded-2xl border border-[var(--mk-rule)] bg-white p-5">
                <div className="text-[13px] font-semibold text-[var(--mk-ink)]">A good fit if your team</div>
                <ul className="mt-3 grid gap-2 text-[14.5px] text-[var(--mk-ink-2)]">
                  {[
                    "Has 20–200 people with product, design and engineering functions",
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
                <div className="mt-5 text-[13px] font-semibold text-[var(--mk-ink)]">What you get</div>
                <ul className="mt-3 grid gap-2 text-[14.5px] text-[var(--mk-ink-2)]">
                  {["Early access for your team", "A direct line to the founder", "A real say in what gets built next"].map((t) => (
                    <li key={t} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--mk-indigo)]" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="mt-5 text-[14px] text-[var(--mk-ink-2)]">
                Already have a workspace?{" "}
                <Link href="/login" className="font-semibold text-[var(--mk-indigo-deep)] underline-offset-4 hover:underline">
                  Log in
                </Link>
              </p>
            </div>
            <div className="relative">
              <DesignPartnerForm />
            </div>
          </div>
        </Section>

        {/* FAQ */}
        <Section className="border-t border-[var(--mk-rule)] bg-white">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className={eyebrow}>Questions</p>
              <h2 className={`${h2} mt-3`}>What teams ask first.</h2>
            </div>
            <div className="divide-y divide-[var(--mk-rule)] border-y border-[var(--mk-rule)]">
              {FAQ.map((f) => (
                <details key={f.q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-semibold">
                    {f.q}
                    <ChevronDown className="h-5 w-5 shrink-0 text-[var(--mk-ink-2)] transition group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--mk-ink-2)]">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </Section>

        {/* Closing */}
        <section className="py-20 sm:py-24">
          <div className={wrap}>
            <div className="relative overflow-hidden rounded-[32px] bg-[var(--mk-ink)] px-6 py-14 text-white sm:px-12">
              <div aria-hidden className="mk-float-2 absolute -right-10 -top-10 h-48 w-56 rotate-12 rounded-[28px] bg-[var(--mk-cyan)]/30" />
              <div aria-hidden className="mk-float absolute -bottom-14 right-24 h-40 w-48 -rotate-6 rounded-[28px] bg-[var(--mk-indigo)]/40" />
              <div className="relative max-w-2xl">
                <h2 className="mk-display text-[2rem] font-bold leading-[1.1] sm:text-[2.6rem]">
                  The next time a thread hits 63 replies, don&apos;t ask who can jump on a call.
                </h2>
                <p className="mt-4 text-[17px] text-white/75">Ask where this thinking should live.</p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <a
                    href="#design-partners"
                    className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-[15px] font-semibold text-[var(--mk-ink)] hover:bg-[#dff6fb]"
                  >
                    Become a design partner <ArrowRight className="h-4 w-4" />
                  </a>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3.5 text-[15px] font-semibold text-white hover:bg-white/10"
                  >
                    Log in
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--mk-rule)] bg-white">
        <div className={`${wrap} grid gap-8 py-12 sm:grid-cols-[1.4fr_1fr]`}>
          <div>
            <Logo size={26} />
            <p className="mt-3 max-w-sm text-[14px] text-[var(--mk-ink-2)]">
              Infrastructure for collaborative thinking. The reasoning layer between chat and meetings.
            </p>
            <div className="mt-5 flex flex-wrap gap-4 text-[14px] font-medium">
              <Link href="/login" className="hover:text-[var(--mk-indigo)]">Log in</Link>
              <a href="#design-partners" className="hover:text-[var(--mk-indigo)]">Design partners</a>
              <a href="#how" className="hover:text-[var(--mk-indigo)]">How it works</a>
              <a href="#ai" className="hover:text-[var(--mk-indigo)]">AI</a>
            </div>
          </div>
          <div className="text-[12.5px] leading-relaxed text-[var(--mk-ink-2)]">
            <div className="mb-2 font-semibold text-[var(--mk-ink)]">Sources</div>
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
            <p className="mt-6">© {new Date().getFullYear()} Collabrr</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
